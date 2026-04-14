const { db } = require("../config/database");

/**
 * Doctor Schedule Controller
 * Handles all doctor scheduling and availability management
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */

// ============================================
// GET: Retrieve all doctors with their details
// ============================================
const getAllDoctors = (req, res) => {
  try {
    const doctors = db.prepare(`
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
    `).all();

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Get Doctors Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctors",
      error: error.message,
    });
  }
};

// ============================================
// GET: Retrieve doctor schedule by doctor ID
// ============================================
const getDoctorSchedule = (req, res) => {
  try {
    const { doctorId } = req.params;

    // Get doctor details
    const doctor = db.prepare("SELECT * FROM doctors WHERE doctor_id = ?").get(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get doctor's schedule
    const schedules = db.prepare(`
      SELECT
        schedule_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration,
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
        END
    `).all(doctorId);

    res.status(200).json({
      success: true,
      data: {
        doctor,
        schedules,
      },
    });
  } catch (error) {
    console.error("Get Doctor Schedule Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor schedule",
      error: error.message,
    });
  }
};

// ============================================
// POST: Create new schedule for a doctor
// ============================================
const createDoctorSchedule = (req, res) => {
  try {
    const { doctorId, dayOfWeek, startTime, endTime, slotDuration } = req.body;

    // Validate required fields
    if (!doctorId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: doctorId, dayOfWeek, startTime, endTime",
      });
    }

    // Check if doctor exists
    const doctor = db.prepare("SELECT doctor_id FROM doctors WHERE doctor_id = ?").get(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check for schedule conflicts
    const conflict = db.prepare(`
      SELECT schedule_id FROM doctor_schedules
       WHERE doctor_id = ?
       AND day_of_week = ?
       AND is_active = 1
       AND (
         (start_time <= ? AND end_time > ?) OR
         (start_time < ? AND end_time >= ?) OR
         (start_time >= ? AND end_time <= ?)
       )
    `).get(doctorId, dayOfWeek, startTime, startTime, endTime, endTime, startTime, endTime);

    if (conflict) {
      return res.status(409).json({
        success: false,
        message:
          "Schedule conflict detected. This time slot overlaps with existing schedule.",
      });
    }

    // Insert new schedule
    const result = db.prepare(`
      INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration)
      VALUES (?, ?, ?, ?, ?)
    `).run(doctorId, dayOfWeek, startTime, endTime, slotDuration || 30);

    // Retrieve the created schedule
    const newSchedule = db.prepare("SELECT * FROM doctor_schedules WHERE schedule_id = ?").get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      data: newSchedule,
    });
  } catch (error) {
    console.error("Create Schedule Error:", error);

    // Handle duplicate entry error
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        message: "Schedule already exists for this doctor, day, and time",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create schedule",
      error: error.message,
    });
  }
};

// ============================================
// PUT: Update existing doctor schedule
// ============================================
const updateDoctorSchedule = (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { dayOfWeek, startTime, endTime, slotDuration, isActive } = req.body;

    // Check if schedule exists
    const schedule = db.prepare("SELECT * FROM doctor_schedules WHERE schedule_id = ?").get(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Build update query dynamically
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

    // Update schedule
    db.prepare(`UPDATE doctor_schedules SET ${updates.join(", ")} WHERE schedule_id = ?`).run(...values);

    // Retrieve updated schedule
    const updatedSchedule = db.prepare("SELECT * FROM doctor_schedules WHERE schedule_id = ?").get(scheduleId);

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("Update Schedule Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update schedule",
      error: error.message,
    });
  }
};

// ============================================
// DELETE: Delete doctor schedule
// ============================================
const deleteDoctorSchedule = (req, res) => {
  try {
    const { scheduleId } = req.params;

    // Check if schedule exists
    const schedule = db.prepare("SELECT * FROM doctor_schedules WHERE schedule_id = ?").get(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Delete schedule (soft delete by setting is_active = FALSE is better)
    db.prepare("UPDATE doctor_schedules SET is_active = 0 WHERE schedule_id = ?").run(scheduleId);

    res.status(200).json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    console.error("Delete Schedule Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete schedule",
      error: error.message,
    });
  }
};

// ============================================
// GET: Search doctors by specialization or department
// ============================================
const searchDoctors = (req, res) => {
  try {
    const { specialization, department, q } = req.query;

    let query = "SELECT * FROM doctors WHERE is_available = 1";
    const params = [];

    if (q) {
      query += " AND (name LIKE ? OR specialization LIKE ? OR department LIKE ?)";
      const searchValue = `%${q}%`;
      params.push(searchValue, searchValue, searchValue);
    }

    if (specialization) {
      query += " AND specialization LIKE ?";
      params.push(`%${specialization}%`);
    }

    if (department) {
      query += " AND department LIKE ?";
      params.push(`%${department}%`);
    }

    query += " ORDER BY name ASC";

    const doctors = db.prepare(query).all(...params);

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Search Doctors Error:", error);
    res.status(500).json({
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
