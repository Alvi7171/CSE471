/**
 * Laboratory Test Routes
 * REST API endpoints for lab test management
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

module.exports = router;
