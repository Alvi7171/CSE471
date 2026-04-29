/**
 * Emergency Response Routes
 * REST API endpoints for emergency response management
 */

const express = require("express");
const router = express.Router();
const labEmergencyController = require("../controllers/labEmergencyController");

// ============================================
// EMERGENCY RESPONSE ROUTES
// ============================================

/**
 * @route   GET /api/emergency/stats
 * @desc    Get emergency statistics
 * @access  Public
 */
router.get("/stats", labEmergencyController.getEmergencyStats);

/**
 * @route   GET /api/emergency/active
 * @desc    Get active emergencies for dashboard
 * @access  Public
 */
router.get("/active", labEmergencyController.getActiveEmergencies);

/**
 * @route   GET /api/emergency/alerts
 * @desc    Get emergency alerts
 * @query   { unreadOnly }
 * @access  Public
 */
router.get("/alerts", labEmergencyController.getEmergencyAlerts);

/**
 * @route   GET /api/emergency/:emergencyId
 * @desc    Get emergency case by ID
 * @access  Public
 */
router.get("/:emergencyId", labEmergencyController.getEmergencyCaseById);

/**
 * @route   PUT /api/emergency/:emergencyId/status
 * @desc    Update emergency case status
 * @body    { status, treatmentGiven, outcome, notes }
 * @access  Public
 */
router.put("/:emergencyId/status", labEmergencyController.updateEmergencyStatus);

/**
 * @route   PUT /api/emergency/:emergencyId/assign-doctor
 * @desc    Assign doctor to emergency case
 * @body    { doctorId }
 * @access  Public
 */
router.put("/:emergencyId/assign-doctor", labEmergencyController.assignDoctorToEmergency);

/**
 * @route   POST /api/emergency
 * @desc    Create new emergency case
 * @body    { patientName, emergencyType, severity, triageCategory, ... }
 * @access  Public
 */
router.post("/", labEmergencyController.createEmergencyCase);

/**
 * @route   GET /api/emergency
 * @desc    Get all emergency cases (with filters)
 * @query   { status, severity, fromDate, toDate }
 * @access  Public
 */
router.get("/", labEmergencyController.getEmergencyCases);

/**
 * @route   GET /api/emergency/patient/:patientPhone
 * @desc    Get patient-specific emergencies
 * @access  Public
 */
router.get("/patient/:patientPhone", labEmergencyController.getPatientEmergencies);

/**
 * @route   PUT /api/emergency/alerts/:alertId/read
 * @desc    Mark alert as read
 * @access  Public
 */
router.put("/alerts/:alertId/read", labEmergencyController.markAlertAsRead);

module.exports = router;
