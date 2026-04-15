/**
 * Appointment Booking Routes
 * Routes for patient appointment booking system
 */

const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/**
 * @route   GET /api/appointments/available-doctors
 * @desc    Get list of doctors available on a specific date
 * @query   date (YYYY-MM-DD)
 * @access  Public
 */
router.get(
  "/available-doctors",
  requireAuth,
  requireRole("patient"),
  appointmentController.getAvailableDoctors,
);

/**
 * @route   GET /api/appointments/available-slots
 * @desc    Get available time slots for a doctor on a specific date
 * @query   doctorId, date (YYYY-MM-DD)
 * @access  Public
 */
router.get(
  "/available-slots",
  requireAuth,
  requireRole("patient"),
  appointmentController.getAvailableSlots,
);

/**
 * @route   POST /api/appointments/book
 * @desc    Book an appointment with a doctor
 * @body    scheduleId, doctorId, patientName, patientAge, patientGender, patientPhone, patientEmail, symptoms, appointmentDate, appointmentTime
 * @access  Public
 */
router.post(
  "/book",
  requireAuth,
  requireRole("patient"),
  appointmentController.bookAppointment,
);

/**
 * @route   GET /api/appointments/doctor/:doctorId
 * @desc    Get all appointments for a specific doctor
 * @params  doctorId
 * @query   date (optional), status (optional)
 * @access  Public (should be protected in production)
 */
router.get(
  "/doctor/:doctorId",
  requireAuth,
  requireRole("doctor", "admin"),
  appointmentController.getDoctorAppointments,
);

/**
 * @route   PUT /api/appointments/:appointmentId/cancel
 * @desc    Cancel an appointment
 * @params  appointmentId
 * @access  Public (should be protected in production)
 */
router.put(
  "/:appointmentId/cancel",
  requireAuth,
  requireRole("patient", "doctor", "admin"),
  appointmentController.cancelAppointment,
);

router.put(
  "/:appointmentId/status",
  requireAuth,
  requireRole("doctor", "admin"),
  appointmentController.updateAppointmentStatus,
);

module.exports = router;
