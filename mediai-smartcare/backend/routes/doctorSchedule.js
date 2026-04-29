const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/**
 * Doctor Scheduling Routes
 * Base URL: http://localhost:1355/api/schedule
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */

// ============================================
// Doctor Routes
// ============================================

/**
 * @route   GET /api/schedule/doctors
 * @desc    Get all available doctors
 * @access  Public
 */
router.get(
  "/doctors",
  requireAuth,
  requireRole("patient", "doctor", "admin"),
  scheduleController.getAllDoctors,
);

/**
 * @route   GET /api/schedule/doctors/search
 * @desc    Search doctors by specialization or department
 * @query   specialization, department
 * @access  Public
 */
router.get(
  "/doctors/search",
  requireAuth,
  requireRole("patient", "doctor", "admin"),
  scheduleController.searchDoctors,
);

/**
 * @route   GET /api/schedule/doctors/:doctorId
 * @desc    Get specific doctor's schedule
 * @access  Public
 */
router.get(
  "/doctors/:doctorId",
  requireAuth,
  requireRole("patient", "doctor", "admin"),
  scheduleController.getDoctorSchedule,
);

// ============================================
// Schedule Management Routes
// ============================================

/**
 * @route   POST /api/schedule/create
 * @desc    Create new schedule for a doctor
 * @body    { doctorId, dayOfWeek, startTime, endTime, slotDuration }
 * @access  Private (Doctor/Admin)
 */
router.post(
  "/create",
  requireAuth,
  requireRole("doctor", "admin"),
  scheduleController.createDoctorSchedule,
);

/**
 * @route   PUT /api/schedule/:scheduleId
 * @desc    Update existing schedule
 * @body    { dayOfWeek, startTime, endTime, slotDuration, isActive }
 * @access  Private (Doctor/Admin)
 */
router.put(
  "/:scheduleId",
  requireAuth,
  requireRole("doctor", "admin"),
  scheduleController.updateDoctorSchedule,
);

/**
 * @route   DELETE /api/schedule/:scheduleId
 * @desc    Delete/deactivate schedule
 * @access  Private (Doctor/Admin)
 */
router.delete(
  "/:scheduleId",
  requireAuth,
  requireRole("doctor", "admin"),
  scheduleController.deleteDoctorSchedule,
);

module.exports = router;
