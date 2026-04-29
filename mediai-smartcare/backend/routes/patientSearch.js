/**
 * Advanced Patient Search & Management Routes
 * Module 1: Patient Management & Medical Timeline
 * Provides comprehensive search, filtering, and analytics endpoints
 */

const express = require("express");
const router = express.Router();
const patientSearchController = require("../controllers/patientSearchController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/**
 * GET /api/patients/search
 * Advanced patient search with multiple filters and pagination
 * Access: Doctors, Admin only
 */
router.get("/search", requireAuth, requireRole("doctor", "admin"), patientSearchController.searchPatients);

/**
 * GET /api/patients/statistics
 * Get patient analytics and statistics
 * Access: Doctors, Admin only
 */
router.get("/statistics", requireAuth, requireRole("doctor", "admin"), patientSearchController.getPatientStatistics);

/**
 * GET /api/patients/recently-active
 * Get recently active patients (with visits in last X days)
 * Access: Doctors, Admin only
 */
router.get("/recently-active", requireAuth, requireRole("doctor", "admin"), patientSearchController.getRecentlyActivePatients);

/**
 * POST /api/patients/export
 * Export patient data in CSV or JSON format
 * Access: Doctors, Admin only
 */
router.post("/export", requireAuth, requireRole("doctor", "admin"), patientSearchController.exportPatients);

/**
 * GET /api/patients/:patientId/dashboard
 * Get comprehensive patient dashboard
 * Access: Doctors, Admin only
 */
router.get("/:patientId/dashboard", requireAuth, requireRole("doctor", "admin"), patientSearchController.getPatientDashboard);

module.exports = router;
