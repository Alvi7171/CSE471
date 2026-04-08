const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

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
router.get("/doctors", scheduleController.getAllDoctors);

/**
 * @route   GET /api/schedule/doctors/search
 * @desc    Search doctors by specialization or department
 * @query   specialization, department
 * @access  Public
 */
router.get("/doctors/search", scheduleController.searchDoctors);

/**
 * @route   GET /api/schedule/doctors/:doctorId
 * @desc    Get specific doctor's schedule
 * @access  Public
 */
router.get("/doctors/:doctorId", scheduleController.getDoctorSchedule);

// ============================================
// Schedule Management Routes
// ============================================

/**
 * @route   POST /api/schedule/create
 * @desc    Create new schedule for a doctor
 * @body    { doctorId, dayOfWeek, startTime, endTime, slotDuration }
 * @access  Private (Doctor/Admin)
 */
router.post("/create", scheduleController.createDoctorSchedule);

/**
 * @route   PUT /api/schedule/:scheduleId
 * @desc    Update existing schedule
 * @body    { dayOfWeek, startTime, endTime, slotDuration, isActive }
 * @access  Private (Doctor/Admin)
 */
router.put("/:scheduleId", scheduleController.updateDoctorSchedule);

/**
 * @route   DELETE /api/schedule/:scheduleId
 * @desc    Delete/deactivate schedule
 * @access  Private (Doctor/Admin)
 */
router.delete("/:scheduleId", scheduleController.deleteDoctorSchedule);

module.exports = router;
