/**
 * Laboratory Test & Emergency Response Routes
 * REST API endpoints for lab test management and emergency response
 */

const express = require("express");
const router = express.Router();
const labEmergencyController = require("../controllers/labEmergencyController");

// ============================================
// LAB TEST ROUTES
// ============================================

/**
 * @route   POST /api/lab/tests
 * @desc    Create new lab test request
 * @body    { patientId, doctorId, testType, testName, priority, ... }
 * @access  Public
 */
router.post("/tests", labEmergencyController.createLabTest);

/**
 * @route   GET /api/lab/tests
 * @desc    Get all lab tests (with filters)
 * @query   { patientId, status, priority, fromDate, toDate }
 * @access  Public
 */
router.get("/tests", labEmergencyController.getLabTests);

/**
 * @route   GET /api/lab/tests/:testId
 * @desc    Get lab test by ID with results and report
 * @access  Public
 */
router.get("/tests/:testId", labEmergencyController.getLabTestById);

/**
 * @route   PUT /api/lab/tests/:testId/status
 * @desc    Update lab test status
 * @body    { status, collectedDate, completedDate }
 * @access  Public
 */
router.put("/tests/:testId/status", labEmergencyController.updateLabTestStatus);

/**
 * @route   POST /api/lab/tests/:testId/results
 * @desc    Add lab test results
 * @body    { results: [{ parameterName, value, unit, ... }] }
 * @access  Public
 */
router.post("/tests/:testId/results", labEmergencyController.addLabResults);

/**
 * @route   POST /api/lab/tests/:testId/report
 * @desc    Generate lab report
 * @body    { reportType, labTechnician, reviewedBy, summary, interpretation }
 * @access  Public
 */
router.post("/tests/:testId/report", labEmergencyController.generateLabReport);

/**
 * @route   PUT /api/lab/reports/:reportId/deliver
 * @desc    Mark lab report as delivered
 * @body    { deliveredTo }
 * @access  Public
 */
router.put("/reports/:reportId/deliver", labEmergencyController.deliverLabReport);

/**
 * @route   GET /api/lab/stats
 * @desc    Get lab test statistics
 * @access  Public
 */
router.get("/stats", labEmergencyController.getLabStats);

// ============================================
// EMERGENCY RESPONSE ROUTES
// ============================================

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
 * @route   GET /api/emergency/active
 * @desc    Get active emergencies for dashboard
 * @access  Public
 */
router.get("/active", labEmergencyController.getActiveEmergencies);

/**
 * @route   GET /api/emergency/stats
 * @desc    Get emergency statistics
 * @access  Public
 */
router.get("/stats", labEmergencyController.getEmergencyStats);

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
 * @route   PUT /api/emergency/alerts/:alertId/read
 * @desc    Mark alert as read
 * @access  Public
 */
router.put("/alerts/:alertId/read", labEmergencyController.markAlertAsRead);

module.exports = router;