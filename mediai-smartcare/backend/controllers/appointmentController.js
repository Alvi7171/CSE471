/**
 * Appointment Booking Controller
 * Handles patient appointment booking, availability checks, and appointment management
 */

const { db } = require("../config/database");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

// Parse YYYY-MM-DD without local/UTC timezone shifts.
const getDayOfWeekFromDateString = (dateString) => {
  const match = ISO_DATE_REGEX.exec(dateString);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  // Reject impossible dates like 2026-02-30.
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
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
};

const formatSlotDisplayTime = (timeString) => timeString.slice(0, 5);

const ensureAppointmentSlotsTable = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointment_slots (
      slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      slot_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'booked')),
      appointment_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (schedule_id, slot_date, slot_time),
      FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(schedule_id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointment_slots_date_doctor
      ON appointment_slots (slot_date, doctor_id, status);
  `);
};

ensureAppointmentSlotsTable();

const insertSlotIfMissingStmt = db.prepare(`
  INSERT OR IGNORE INTO appointment_slots
  (schedule_id, doctor_id, slot_date, slot_time, status)
  VALUES (?, ?, ?, ?, 'available')
`);

const getSlotByCompositeKeyStmt = db.prepare(`
  SELECT slot_id, status
  FROM appointment_slots
  WHERE schedule_id = ? AND slot_date = ? AND slot_time = ?
`);

const getActiveAppointmentForSlotStmt = db.prepare(`
  SELECT appointment_id
  FROM appointments
  WHERE schedule_id = ?
    AND appointment_date = ?
    AND appointment_time = ?
    AND status != 'cancelled'
  LIMIT 1
`);

const markSlotAsBookedStmt = db.prepare(`
  UPDATE appointment_slots
  SET status = 'booked',
      appointment_id = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE slot_id = ?
`);

const syncSlotAsBookedByCompositeKeyStmt = db.prepare(`
  UPDATE appointment_slots
  SET status = 'booked',
      appointment_id = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE schedule_id = ?
    AND slot_date = ?
    AND slot_time = ?
`);

const markSlotAsAvailableStmt = db.prepare(`
  UPDATE appointment_slots
  SET status = 'available',
      appointment_id = NULL,
      updated_at = CURRENT_TIMESTAMP
  WHERE schedule_id = ? AND slot_date = ? AND slot_time = ?
`);

const insertAppointmentStmt = db.prepare(`
  INSERT INTO appointments (
    schedule_id,
    doctor_id,
    patient_name,
    patient_age,
    patient_gender,
    patient_phone,
    patient_email,
    symptoms,
    appointment_date,
    appointment_time,
    status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
`);

/**
 * Get available doctors on a specific date
 * GET /api/appointments/available-doctors?date=YYYY-MM-DD
 */
exports.getAvailableDoctors = (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date parameter is required (format: YYYY-MM-DD)",
      });
    }

    const dayOfWeek = getDayOfWeekFromDateString(date);
    if (!dayOfWeek) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Get doctors with schedules on this date
    const query = `
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
      AND (
        s.schedule_date = ?
        OR (s.day_of_week = ? AND s.schedule_date IS NULL)
      )
      ORDER BY d.name
    `;

    const doctors = db.prepare(query).all(date, dayOfWeek);

    res.json({
      success: true,
      date,
      dayOfWeek,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error("Error fetching available doctors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available doctors",
      error: error.message,
    });
  }
};

/**
 * Get available time slots for a doctor on a specific date
 * GET /api/appointments/available-slots?doctorId=1&date=YYYY-MM-DD
 */
exports.getAvailableSlots = (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "doctorId and date parameters are required",
      });
    }

    const dayOfWeek = getDayOfWeekFromDateString(date);
    if (!dayOfWeek) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Get schedules for this doctor on this date
    const schedules = db
      .prepare(
        `
      SELECT 
        schedule_id,
        start_time,
        end_time,
        slot_duration
      FROM doctor_schedules
      WHERE doctor_id = ?
      AND is_active = 1
      AND (
        schedule_date = ?
        OR (day_of_week = ? AND schedule_date IS NULL)
      )
      ORDER BY start_time
    `,
      )
      .all(doctorId, date, dayOfWeek);

    if (schedules.length === 0) {
      return res.json({
        success: true,
        message: "No schedules available for this doctor on this date",
        slots: [],
      });
    }

    const scheduleIds = schedules.map((schedule) => schedule.schedule_id);
    const schedulePlaceholders = scheduleIds.map(() => "?").join(", ");
    const existingSlots = db
      .prepare(
        `
      SELECT schedule_id, slot_time, status
      FROM appointment_slots
      WHERE slot_date = ?
      AND schedule_id IN (${schedulePlaceholders})
    `,
      )
      .all(date, ...scheduleIds);

    const slotStatusMap = new Map();
    existingSlots.forEach((slot) => {
      slotStatusMap.set(`${slot.schedule_id}|${slot.slot_time}`, slot.status);
    });

    // Sync with pre-existing active appointments so old records are reflected as booked slots.
    const bookedAppointmentMap = new Map();
    try {
      const bookedAppointments = db
        .prepare(
          `
        SELECT appointment_id, schedule_id, appointment_time
        FROM appointments
        WHERE appointment_date = ?
          AND status != 'cancelled'
          AND schedule_id IN (${schedulePlaceholders})
      `,
        )
        .all(date, ...scheduleIds);

      bookedAppointments.forEach((appointment) => {
        bookedAppointmentMap.set(
          `${appointment.schedule_id}|${appointment.appointment_time}`,
          appointment.appointment_id,
        );
      });
    } catch (error) {
      if (!String(error.message).includes("no such table: appointments")) {
        throw error;
      }
    }

    // Generate time slots from schedules
    const allSlots = [];

    schedules.forEach((schedule) => {
      const startMinutes = timeToMinutes(schedule.start_time);
      const endMinutes = timeToMinutes(schedule.end_time);

      if (
        startMinutes === null ||
        endMinutes === null ||
        !schedule.slot_duration ||
        schedule.slot_duration <= 0
      ) {
        return;
      }

      for (
        let time = startMinutes;
        time < endMinutes;
        time += schedule.slot_duration
      ) {
        const slotHour = Math.floor(time / 60);
        const slotMin = time % 60;
        const timeStr = `${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}:00`;
        const slotKey = `${schedule.schedule_id}|${timeStr}`;
        const status = slotStatusMap.get(slotKey) || "available";

        // Persist generated slot rows so each slot has a stored status.
        insertSlotIfMissingStmt.run(
          schedule.schedule_id,
          Number(doctorId),
          date,
          timeStr,
        );

        const bookedAppointmentId = bookedAppointmentMap.get(slotKey);
        if (bookedAppointmentId) {
          syncSlotAsBookedByCompositeKeyStmt.run(
            bookedAppointmentId,
            schedule.schedule_id,
            date,
            timeStr,
          );
        }

        allSlots.push({
          schedule_id: schedule.schedule_id,
          time: timeStr,
          display_time: formatSlotDisplayTime(timeStr),
          duration: schedule.slot_duration,
          status: bookedAppointmentId ? "booked" : status,
        });
      }
    });

    res.json({
      success: true,
      date,
      doctorId: parseInt(doctorId),
      slots: allSlots,
    });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available slots",
      error: error.message,
    });
  }
};

/**
 * Book an appointment
 * POST /api/appointments/book
 */
exports.bookAppointment = (req, res) => {
  try {
    const {
      scheduleId,
      doctorId,
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      patientEmail,
      symptoms,
      appointmentDate,
      appointmentTime,
    } = req.body;

    // Validation
    if (
      !scheduleId ||
      !doctorId ||
      !patientName ||
      !patientAge ||
      !patientPhone ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const dayOfWeek = getDayOfWeekFromDateString(appointmentDate);
    if (!dayOfWeek) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointmentDate format. Use YYYY-MM-DD",
      });
    }

    if (!TIME_REGEX.test(appointmentTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointmentTime format. Use HH:MM:SS",
      });
    }

    // Check if schedule exists, belongs to doctor, and is active on this date.
    const schedule = db
      .prepare(
        `
      SELECT
        schedule_id,
        doctor_id,
        start_time,
        end_time,
        slot_duration
      FROM doctor_schedules
      WHERE schedule_id = ?
        AND doctor_id = ?
        AND is_active = 1
        AND (
          schedule_date = ?
          OR (day_of_week = ? AND schedule_date IS NULL)
        )
    `,
      )
      .get(scheduleId, doctorId, appointmentDate, dayOfWeek);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found for this doctor/date or inactive",
      });
    }

    const appointmentMinutes = timeToMinutes(appointmentTime);
    const scheduleStartMinutes = timeToMinutes(schedule.start_time);
    const scheduleEndMinutes = timeToMinutes(schedule.end_time);
    if (
      appointmentMinutes === null ||
      scheduleStartMinutes === null ||
      scheduleEndMinutes === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule time configuration",
      });
    }

    if (
      appointmentMinutes < scheduleStartMinutes ||
      appointmentMinutes >= scheduleEndMinutes
    ) {
      return res.status(400).json({
        success: false,
        message: "Appointment time is outside doctor schedule range",
      });
    }

    if ((appointmentMinutes - scheduleStartMinutes) % schedule.slot_duration !== 0) {
      return res.status(400).json({
        success: false,
        message: "Appointment time is not aligned with slot duration",
      });
    }

    const bookSlotTransaction = db.transaction(() => {
      insertSlotIfMissingStmt.run(
        scheduleId,
        doctorId,
        appointmentDate,
        appointmentTime,
      );

      const slot = getSlotByCompositeKeyStmt.get(
        scheduleId,
        appointmentDate,
        appointmentTime,
      );

      if (!slot || slot.status === "booked") {
        const error = new Error("This time slot is already booked");
        error.code = "SLOT_ALREADY_BOOKED";
        throw error;
      }

      // Backward compatibility: if old appointment data already occupies slot.
      const existingAppointment = getActiveAppointmentForSlotStmt.get(
        scheduleId,
        appointmentDate,
        appointmentTime,
      );
      if (existingAppointment) {
        markSlotAsBookedStmt.run(existingAppointment.appointment_id, slot.slot_id);
        const error = new Error("This time slot is already booked");
        error.code = "SLOT_ALREADY_BOOKED";
        throw error;
      }

      const result = insertAppointmentStmt.run(
        scheduleId,
        doctorId,
        patientName,
        patientAge,
        patientGender,
        patientPhone,
        patientEmail,
        symptoms,
        appointmentDate,
        appointmentTime,
      );

      markSlotAsBookedStmt.run(result.lastInsertRowid, slot.slot_id);
      return result.lastInsertRowid;
    });

    let appointmentId;
    try {
      appointmentId = bookSlotTransaction();
    } catch (transactionError) {
      if (transactionError.code === "SLOT_ALREADY_BOOKED") {
        return res.status(409).json({
          success: false,
          message: "This time slot is already booked",
        });
      }
      throw transactionError;
    }

    // Get the created appointment
    const appointment = db
      .prepare(
        `
      SELECT 
        a.*,
        d.name as doctor_name,
        d.specialization,
        d.consultation_fee
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.appointment_id = ?
    `,
      )
      .get(appointmentId);

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to book appointment",
      error: error.message,
    });
  }
};

/**
 * Get appointments for a doctor
 * GET /api/appointments/doctor/:doctorId
 */
exports.getDoctorAppointments = (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, status } = req.query;

    let query = `
      SELECT 
        a.*,
        d.name as doctor_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.doctor_id = ?
    `;
    const params = [doctorId];

    if (date) {
      query += " AND a.appointment_date = ?";
      params.push(date);
    }

    if (status) {
      query += " AND a.status = ?";
      params.push(status);
    }

    query += " ORDER BY a.appointment_date DESC, a.appointment_time DESC";

    const appointments = db.prepare(query).all(...params);

    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Error fetching doctor appointments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
};

/**
 * Cancel an appointment
 * PUT /api/appointments/:appointmentId/cancel
 */
exports.cancelAppointment = (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = db
      .prepare(
        `
      SELECT appointment_id, status, schedule_id, appointment_date, appointment_time
      FROM appointments
      WHERE appointment_id = ?
    `,
      )
      .get(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status === "cancelled") {
      return res.json({
        success: true,
        message: "Appointment is already cancelled",
      });
    }

    const cancelAppointmentTx = db.transaction(() => {
      const result = db
        .prepare(
          `
        UPDATE appointments
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE appointment_id = ?
      `,
        )
        .run(appointmentId);

      markSlotAsAvailableStmt.run(
        appointment.schedule_id,
        appointment.appointment_date,
        appointment.appointment_time,
      );

      return result;
    });

    const result = cancelAppointmentTx();

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
      error: error.message,
    });
  }
};

/**
 * Ornov Update notes for an appointment
 * PUT /api/appointments/:appointmentId/notes
 */
exports.updateAppointmentNotes = (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { notes } = req.body;

    const result = db
      .prepare(
        `
      UPDATE appointments
      SET notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = ?
    `
      )
      .run(notes, appointmentId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      message: "Notes updated successfully",
    });
  } catch (error) {
    console.error("Error updating appointment notes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notes",
      error: error.message,
    });
  }
};

module.exports = exports;
