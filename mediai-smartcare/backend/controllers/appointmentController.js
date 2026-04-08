/**
 * Appointment Booking Controller
 * Handles patient appointment booking, availability checks, and appointment management
 */

const { db } = require("../config/database");

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

    // Get day of week from date
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

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

    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Get schedules for this doctor on this date
    const schedules = db
      .prepare(
        `
      SELECT 
        schedule_id,
        start_time,
        end_time,
        slot_duration,
        max_patients,
        (SELECT COUNT(*) FROM appointments 
         WHERE schedule_id = doctor_schedules.schedule_id 
         AND appointment_date = ? 
         AND status != 'cancelled') as booked_count
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
      .all(date, doctorId, date, dayOfWeek);

    if (schedules.length === 0) {
      return res.json({
        success: true,
        message: "No schedules available for this doctor on this date",
        slots: [],
      });
    }

    // Generate time slots from schedules
    const allSlots = [];

    schedules.forEach((schedule) => {
      const available = schedule.max_patients - schedule.booked_count;

      if (available > 0) {
        const [startHour, startMin] = schedule.start_time
          .split(":")
          .map(Number);
        const [endHour, endMin] = schedule.end_time.split(":").map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Generate slots
        for (
          let time = startMinutes;
          time < endMinutes;
          time += schedule.slot_duration
        ) {
          const slotHour = Math.floor(time / 60);
          const slotMin = time % 60;
          const timeStr = `${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}:00`;

          allSlots.push({
            schedule_id: schedule.schedule_id,
            time: timeStr,
            display_time: `${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}`,
            duration: schedule.slot_duration,
            max_patients: schedule.max_patients,
            booked_count: schedule.booked_count,
            available_spots: available,
          });
        }
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

    // Check if schedule exists and is active
    const schedule = db
      .prepare(
        `
      SELECT 
        schedule_id,
        max_patients,
        (SELECT COUNT(*) FROM appointments 
         WHERE schedule_id = ? 
         AND appointment_date = ? 
         AND status != 'cancelled') as booked_count
      FROM doctor_schedules
      WHERE schedule_id = ? AND is_active = 1
    `,
      )
      .get(scheduleId, appointmentDate, scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found or inactive",
      });
    }

    // Check if max capacity reached
    if (schedule.booked_count >= schedule.max_patients) {
      return res.status(409).json({
        success: false,
        message: `Maximum patient capacity (${schedule.max_patients}) reached for this time slot`,
      });
    }

    // Insert appointment
    const result = db
      .prepare(
        `
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
    `,
      )
      .run(
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
      .get(result.lastInsertRowid);

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

    const result = db
      .prepare(
        `
      UPDATE appointments
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = ?
    `,
      )
      .run(appointmentId);

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

module.exports = exports;
