const { query } = require("../config/database");

const getAllDoctors = async (req, res) => {
  try {
    if (req.user?.role === "doctor") {
      if (!req.user.doctorId) {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not linked to a doctor profile",
        });
      }

      const doctors = await query(
        `
        SELECT
          doctor_id,
          name,
          email,
          phone,
          specialization,
          department,
          qualification,
          experience_years,
          consultation_fee,
          is_available,
          created_at
        FROM doctors
        WHERE is_available = 1 AND doctor_id = ?
        LIMIT 1
        `,
        [req.user.doctorId],
      );

      return res.status(200).json({
        success: true,
        count: doctors.length,
        data: doctors,
      });
    }

    const doctors = await query(
      `
      SELECT
        doctor_id,
        name,
        email,
        phone,
        specialization,
        department,
        qualification,
        experience_years,
        consultation_fee,
        is_available,
        created_at
      FROM doctors
      WHERE is_available = 1
      ORDER BY name ASC
      `,
    );

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve doctors",
      error: error.message,
    });
  }
};

const getDoctorSchedule = async (req, res) => {
  try {
    let { doctorId } = req.params;

    if (req.user?.role === "doctor") {
      if (!req.user.doctorId) {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not linked to a doctor profile",
        });
      }

      if (Number(doctorId) !== Number(req.user.doctorId)) {
        return res.status(403).json({
          success: false,
          message: "You can access only your own schedule",
        });
      }

      doctorId = req.user.doctorId;
    }

    const doctorRows = await query(
      "SELECT * FROM doctors WHERE doctor_id = ? LIMIT 1",
      [doctorId],
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const schedules = await query(
      `
      SELECT
        schedule_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration,
        schedule_date,
        max_patients,
        is_active
      FROM doctor_schedules
      WHERE doctor_id = ? AND is_active = 1
      ORDER BY
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
          ELSE 8
        END,
        start_time
      `,
      [doctorId],
    );

    return res.status(200).json({
      success: true,
      data: {
        doctor: doctorRows[0],
        schedules,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor schedule",
      error: error.message,
    });
  }
};

const createDoctorSchedule = async (req, res) => {
  try {
    const {
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      scheduleDate,
      maxPatients,
    } = req.body;
    const consultationFee = req.body.consultationFee;
    let doctorId = req.body.doctorId;

    if (req.user?.role === "doctor") {
      if (!req.user.doctorId) {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not linked to a doctor profile",
        });
      }
      doctorId = req.user.doctorId;
    }

    if (!doctorId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: doctorId, dayOfWeek, startTime, endTime",
      });
    }

    const doctorRows = await query(
      "SELECT doctor_id FROM doctors WHERE doctor_id = ? LIMIT 1",
      [doctorId],
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const conflicts = await query(
      `
      SELECT schedule_id
      FROM doctor_schedules
      WHERE doctor_id = ?
        AND day_of_week = ?
        AND is_active = 1
        AND ((schedule_date IS NULL AND ? IS NULL) OR schedule_date = ?)
        AND (
          (start_time <= ? AND end_time > ?)
          OR (start_time < ? AND end_time >= ?)
          OR (start_time >= ? AND end_time <= ?)
        )
      LIMIT 1
      `,
      [
        doctorId,
        dayOfWeek,
        scheduleDate || null,
        scheduleDate || null,
        startTime,
        startTime,
        endTime,
        endTime,
        startTime,
        endTime,
      ],
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Schedule conflict detected",
      });
    }

    if (
      consultationFee !== undefined &&
      consultationFee !== null &&
      consultationFee !== ""
    ) {
      const feeValue = Number(consultationFee);

      if (!Number.isFinite(feeValue) || feeValue < 0) {
        return res.status(400).json({
          success: false,
          message: "consultationFee must be a positive number",
        });
      }

      await query(
        "UPDATE doctors SET consultation_fee = ? WHERE doctor_id = ?",
        [feeValue, doctorId],
      );
    }

    const result = await query(
      `
      INSERT INTO doctor_schedules
      (doctor_id, day_of_week, start_time, end_time, slot_duration, schedule_date, max_patients)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        doctorId,
        dayOfWeek,
        startTime,
        endTime,
        slotDuration || 30,
        scheduleDate || null,
        maxPatients || 10,
      ],
    );

    const createdRows = await query(
      "SELECT * FROM doctor_schedules WHERE schedule_id = ? LIMIT 1",
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      data: createdRows[0],
    });
  } catch (error) {
    if (String(error.message).includes("Duplicate entry")) {
      return res.status(409).json({
        success: false,
        message: "Schedule already exists for this doctor/day/time",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create schedule",
      error: error.message,
    });
  }
};

const updateDoctorSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const {
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      isActive,
      maxPatients,
    } = req.body;

    const existing = await query(
      "SELECT * FROM doctor_schedules WHERE schedule_id = ? LIMIT 1",
      [scheduleId],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    if (
      req.user?.role === "doctor" &&
      Number(existing[0].doctor_id) !== Number(req.user.doctorId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can update only your own schedule",
      });
    }

    const updates = [];
    const values = [];

    if (dayOfWeek) {
      updates.push("day_of_week = ?");
      values.push(dayOfWeek);
    }
    if (startTime) {
      updates.push("start_time = ?");
      values.push(startTime);
    }
    if (endTime) {
      updates.push("end_time = ?");
      values.push(endTime);
    }
    if (slotDuration) {
      updates.push("slot_duration = ?");
      values.push(slotDuration);
    }
    if (maxPatients) {
      updates.push("max_patients = ?");
      values.push(maxPatients);
    }
    if (isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    values.push(scheduleId);

    await query(
      `UPDATE doctor_schedules SET ${updates.join(", ")} WHERE schedule_id = ?`,
      values,
    );

    const updatedRows = await query(
      "SELECT * FROM doctor_schedules WHERE schedule_id = ? LIMIT 1",
      [scheduleId],
    );

    return res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data: updatedRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update schedule",
      error: error.message,
    });
  }
};

const deleteDoctorSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const existing = await query(
      "SELECT schedule_id, doctor_id FROM doctor_schedules WHERE schedule_id = ? LIMIT 1",
      [scheduleId],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    if (
      req.user?.role === "doctor" &&
      Number(existing[0].doctor_id) !== Number(req.user.doctorId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own schedule",
      });
    }

    await query(
      "UPDATE doctor_schedules SET is_active = 0 WHERE schedule_id = ?",
      [scheduleId],
    );

    return res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete schedule",
      error: error.message,
    });
  }
};

const searchDoctors = async (req, res) => {
  try {
    const { specialization, department, q } = req.query;

    if (req.user?.role === "doctor") {
      if (!req.user.doctorId) {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not linked to a doctor profile",
        });
      }

      let sql =
        "SELECT * FROM doctors WHERE is_available = 1 AND doctor_id = ?";
      const params = [req.user.doctorId];

      if (q) {
        sql +=
          " AND (name LIKE ? OR specialization LIKE ? OR department LIKE ?)";
        const searchValue = `%${q}%`;
        params.push(searchValue, searchValue, searchValue);
      }

      if (specialization) {
        sql += " AND specialization LIKE ?";
        params.push(`%${specialization}%`);
      }

      if (department) {
        sql += " AND department LIKE ?";
        params.push(`%${department}%`);
      }

      const doctors = await query(sql, params);

      return res.status(200).json({
        success: true,
        count: doctors.length,
        data: doctors,
      });
    }

    let sql = "SELECT * FROM doctors WHERE is_available = 1";
    const params = [];

    if (q) {
      sql += " AND (name LIKE ? OR specialization LIKE ? OR department LIKE ?)";
      const searchValue = `%${q}%`;
      params.push(searchValue, searchValue, searchValue);
    }

    if (specialization) {
      sql += " AND specialization LIKE ?";
      params.push(`%${specialization}%`);
    }

    if (department) {
      sql += " AND department LIKE ?";
      params.push(`%${department}%`);
    }

    sql += " ORDER BY name ASC";

    const doctors = await query(sql, params);

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search doctors",
      error: error.message,
    });
  }
};

module.exports = {
  getAllDoctors,
  getDoctorSchedule,
  createDoctorSchedule,
  updateDoctorSchedule,
  deleteDoctorSchedule,
  searchDoctors,
};
