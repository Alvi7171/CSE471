const { db, query } = require("../config/database");
const {
  dispatchAppointmentNotifications,
} = require("../utils/notificationService");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ISO_DATE_REGEX = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
const TIME_REGEX = /^([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/;

const getDayOfWeekFromDateString = (dateString) => {
  const match = ISO_DATE_REGEX.exec(dateString);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return DAY_NAMES[utcDate.getUTCDay()];
};

const timeToMinutes = (timeString) => {
  const match = TIME_REGEX.exec(timeString);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

const resolveScheduleWindowMinutes = (startTime, endTime) => {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  // Treat HH:MM -> 00:00 as an end-of-day schedule (e.g., 19:00-00:00).
  if (endMinutes === 0 && startMinutes > 0) {
    endMinutes = 24 * 60;
  }

  if (endMinutes <= startMinutes) {
    return null;
  }

  return { startMinutes, endMinutes };
};

const formatSlotDisplayTime = (timeString) => timeString.slice(0, 5);

const notifyAppointmentEvent = async (appointmentId, eventType) => {
  try {
    await dispatchAppointmentNotifications(appointmentId, eventType);
    return null;
  } catch (error) {
    console.error(
      `Notification dispatch failed for appointment ${appointmentId}:`,
      error.message,
    );
    return "Appointment saved, but one or more notifications could not be processed.";
  }
};

exports.getAvailableDoctors = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date parameter is required (YYYY-MM-DD)",
      });
    }

    const dayOfWeek = getDayOfWeekFromDateString(date);
    if (!dayOfWeek) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const doctors = await query(
      `
      SELECT DISTINCT
        d.doctor_id,
        d.name,
        d.specialization,
        d.department,
        d.qualification,
        d.experience_years,
        d.consultation_fee,
        d.phone,
        d.email
      FROM doctors d
      INNER JOIN doctor_schedules s ON d.doctor_id = s.doctor_id
      WHERE d.is_available = 1
        AND s.is_active = 1
        AND (s.schedule_date = ? OR (s.day_of_week = ? AND s.schedule_date IS NULL))
      ORDER BY d.name ASC
      `,
      [date, dayOfWeek],
    );

    return res.json({
      success: true,
      date,
      dayOfWeek,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available doctors",
      error: error.message,
    });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "doctorId and date are required",
      });
    }

    const dayOfWeek = getDayOfWeekFromDateString(date);
    if (!dayOfWeek) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const schedules = await query(
      `
      SELECT schedule_id, start_time, end_time, slot_duration
      FROM doctor_schedules
      WHERE doctor_id = ?
        AND is_active = 1
        AND (schedule_date = ? OR (day_of_week = ? AND schedule_date IS NULL))
      ORDER BY start_time ASC
      `,
      [doctorId, date, dayOfWeek],
    );

    if (schedules.length === 0) {
      return res.json({
        success: true,
        slots: [],
        message: "No schedules available for this doctor on this date",
      });
    }

    const scheduleIds = schedules.map((s) => s.schedule_id);
    const placeholders = scheduleIds.map(() => "?").join(",");

    const bookedRows = await query(
      `
      SELECT schedule_id, appointment_time
      FROM appointments
      WHERE appointment_date = ?
        AND status IN ('pending', 'confirmed', 'completed')
        AND schedule_id IN (${placeholders})
      `,
      [date, ...scheduleIds],
    );

    const bookedMap = new Set(
      bookedRows.map((row) => `${row.schedule_id}|${row.appointment_time}`),
    );

    const allSlots = [];

    for (const schedule of schedules) {
      const slotDuration = Number(schedule.slot_duration || 30);
      const window = resolveScheduleWindowMinutes(
        schedule.start_time,
        schedule.end_time,
      );

      if (
        !window ||
        slotDuration <= 0 ||
        window.endMinutes <= window.startMinutes
      ) {
        continue;
      }

      for (
        let t = window.startMinutes;
        t < window.endMinutes;
        t += slotDuration
      ) {
        const normalizedMinutes = t % (24 * 60);
        const hour = Math.floor(normalizedMinutes / 60);
        const minute = normalizedMinutes % 60;
        const slotTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
        const key = `${schedule.schedule_id}|${slotTime}`;
        const booked = bookedMap.has(key);

        allSlots.push({
          schedule_id: schedule.schedule_id,
          time: slotTime,
          display_time: formatSlotDisplayTime(slotTime),
          duration: slotDuration,
          status: booked ? "booked" : "available",
        });
      }
    }

    return res.json({
      success: true,
      date,
      doctorId: Number(doctorId),
      slots: allSlots,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available slots",
      error: error.message,
    });
  }
};

exports.bookAppointment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { scheduleId, doctorId, symptoms, appointmentDate, appointmentTime } =
      req.body;

    const patientRows = await query(
      `
      SELECT full_name, age, gender, phone, email
      FROM users
      WHERE user_id = ? AND role = 'patient'
      LIMIT 1
      `,
      [req.user.userId],
    );

    if (patientRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Only patient accounts can book appointments",
      });
    }

    const patient = patientRows[0];
    const patientName = patient.full_name;
    const patientAge = Number(patient.age || 0);
    const patientGender = patient.gender || null;
    const patientPhone = patient.phone || null;
    const patientEmail = patient.email || null;

    if (!scheduleId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!patientName || !patientPhone || !patientAge) {
      return res.status(400).json({
        success: false,
        message:
          "Your patient profile is incomplete. Please update name, age, and mobile number.",
      });
    }

    const dayOfWeek = getDayOfWeekFromDateString(appointmentDate);
    if (!dayOfWeek) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointmentDate format",
      });
    }

    if (!TIME_REGEX.test(appointmentTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointmentTime format. Use HH:MM:SS",
      });
    }

    await connection.beginTransaction();

    const [scheduleRows] = await connection.execute(
      `
      SELECT schedule_id, doctor_id, start_time, end_time, slot_duration
      FROM doctor_schedules
      WHERE schedule_id = ?
        AND doctor_id = ?
        AND is_active = 1
        AND (schedule_date = ? OR (day_of_week = ? AND schedule_date IS NULL))
      FOR UPDATE
      `,
      [scheduleId, doctorId, appointmentDate, dayOfWeek],
    );

    if (scheduleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Schedule not found for this doctor/date",
      });
    }

    const schedule = scheduleRows[0];
    const appointmentMinutes = timeToMinutes(appointmentTime);
    const scheduleWindow = resolveScheduleWindowMinutes(
      schedule.start_time,
      schedule.end_time,
    );
    const scheduleStart = scheduleWindow?.startMinutes ?? null;
    const scheduleEnd = scheduleWindow?.endMinutes ?? null;
    const slotDuration = Number(schedule.slot_duration || 30);

    if (
      appointmentMinutes === null ||
      scheduleStart === null ||
      scheduleEnd === null ||
      appointmentMinutes < scheduleStart ||
      appointmentMinutes >= scheduleEnd ||
      (appointmentMinutes - scheduleStart) % slotDuration !== 0
    ) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Appointment time is invalid for this schedule",
      });
    }

    const [existingRows] = await connection.execute(
      `
      SELECT appointment_id
      FROM appointments
      WHERE schedule_id = ?
        AND appointment_date = ?
        AND appointment_time = ?
        AND status IN ('pending', 'confirmed', 'completed')
      LIMIT 1
      FOR UPDATE
      `,
      [scheduleId, appointmentDate, appointmentTime],
    );

    if (existingRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    const [insertResult] = await connection.execute(
      `
      INSERT INTO appointments (
        schedule_id,
        doctor_id,
        patient_user_id,
        patient_name,
        patient_age,
        patient_gender,
        patient_phone,
        patient_email,
        symptoms,
        appointment_date,
        appointment_time,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        scheduleId,
        doctorId,
        req.user.userId,
        patientName,
        Number(patientAge),
        patientGender || null,
        patientPhone,
        patientEmail || null,
        symptoms || "No symptoms provided",
        appointmentDate,
        appointmentTime,
      ],
    );

    await connection.commit();

    const appointmentRows = await query(
      `
      SELECT
        a.*,
        d.name AS doctor_name,
        d.specialization,
        d.consultation_fee
      FROM appointments a
      JOIN doctors d ON d.doctor_id = a.doctor_id
      WHERE a.appointment_id = ?
      LIMIT 1
      `,
      [insertResult.insertId],
    );

    const notificationWarning = await notifyAppointmentEvent(
      insertResult.insertId,
      "confirmation",
    );

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment: appointmentRows[0],
      notificationWarning,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Failed to book appointment",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getDoctorAppointments = async (req, res) => {
  try {
    let { doctorId } = req.params;
    const { date, status } = req.query;

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
          message: "You can access only your own appointments",
        });
      }

      doctorId = req.user.doctorId;
    }

    let sql = `
      SELECT
        a.*,
        d.name AS doctor_name
      FROM appointments a
      JOIN doctors d ON d.doctor_id = a.doctor_id
      WHERE a.doctor_id = ?
    `;

    const params = [doctorId];

    if (date) {
      sql += " AND a.appointment_date = ?";
      params.push(date);
    }

    if (status) {
      sql += " AND a.status = ?";
      params.push(status);
    }

    sql += " ORDER BY a.appointment_date DESC, a.appointment_time DESC";

    const appointments = await query(sql, params);

    return res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const rows = await query(
      `
      SELECT appointment_id, doctor_id, patient_user_id, status
      FROM appointments
      WHERE appointment_id = ?
      LIMIT 1
      `,
      [appointmentId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (rows[0].status === "cancelled") {
      return res.json({
        success: true,
        message: "Appointment is already cancelled",
      });
    }

    if (
      req.user?.role === "patient" &&
      Number(rows[0].patient_user_id) !== Number(req.user.userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can cancel only your own appointments",
      });
    }

    if (
      req.user?.role === "doctor" &&
      Number(rows[0].doctor_id) !== Number(req.user.doctorId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can cancel only your own appointments",
      });
    }

    await query(
      "UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?",
      [appointmentId],
    );

    const notificationWarning = await notifyAppointmentEvent(
      appointmentId,
      "cancellation",
    );

    return res.json({
      success: true,
      message: "Appointment cancelled successfully",
      notificationWarning,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
      error: error.message,
    });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!["confirmed", "declined"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be confirmed or declined",
      });
    }

    const rows = await query(
      "SELECT appointment_id, doctor_id, status FROM appointments WHERE appointment_id = ? LIMIT 1",
      [appointmentId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const appointment = rows[0];

    if (
      req.user?.role === "doctor" &&
      Number(appointment.doctor_id) !== Number(req.user.doctorId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can update only your own appointments",
      });
    }

    await query(
      "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?",
      [status, appointmentId],
    );

    const notificationWarning = await notifyAppointmentEvent(
      appointmentId,
      status === "declined" ? "cancellation" : "update",
    );

    return res.json({
      success: true,
      message:
        status === "confirmed"
          ? "Appointment approved successfully"
          : "Appointment declined successfully",
      notificationWarning,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update appointment status",
      error: error.message,
    });
  }
};
