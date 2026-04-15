const express = require("express");
const router = express.Router();
const symptomController = require("../controllers/symptomController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/**
 * AI Symptom Checker Routes
 * Base URL: http://localhost:1355/api/symptoms
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */

// ============================================
// Symptom Analysis Routes
// ============================================

/**
 * @route   POST /api/symptoms/check
 * @desc    Analyze symptoms using AI and save to database
 * @body    { patientName, age, gender, symptoms }
 * @access  Public
 */
router.post(
  "/check",
  requireAuth,
  requireRole("patient"),
  symptomController.checkSymptoms,
);

/**
 * @route   POST /api/symptoms/triage
 * @desc    Quick triage assessment (no database save)
 * @body    { symptoms }
 * @access  Public
 */
router.post(
  "/triage",
  requireAuth,
  requireRole("patient"),
  symptomController.quickTriage,
);

// ============================================
// History & Records Routes
// ============================================

/**
 * @route   GET /api/symptoms/history
 * @desc    Get symptom check history
 * @query   patientName (optional), limit (optional)
 * @access  Public
 */
router.get(
  "/history",
  requireAuth,
  requireRole("patient"),
  symptomController.getSymptomHistory,
);

/**
 * @route   GET /api/symptoms/stats/overview
 * @desc    Get symptom check statistics
 * @access  Private (Admin)
 */
router.get(
  "/stats/overview",
  requireAuth,
  requireRole("admin"),
  symptomController.getSymptomStatistics,
);

/**
 * @route   GET /api/symptoms/:checkId
 * @desc    Get specific symptom check by ID
 * @access  Public
 */
router.get(
  "/:checkId",
  requireAuth,
  requireRole("patient"),
  symptomController.getSymptomCheckById,
);

module.exports = router;
