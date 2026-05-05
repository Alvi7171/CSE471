/**
 * Patient Management Routes
 * REST API endpoints for patient registration, medical history, and access control
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */
const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// ============================================
// PATIENT LISTING & SEARCH
// ============================================
router.get("/", requireAuth, requireRole("doctor", "admin"), patientController.getAllPatients);
router.get("/phone/:phone/timeline", requireAuth, requireRole("doctor", "admin"), patientController.getPatientTimelineByPhone);

// ============================================
// PATIENT REGISTRATION (Admin only)
// ============================================

/**
 * @route   POST /api/patients/register
 * @desc    Register a new patient with smart patient ID
 * @access  Admin only
 */
router.post("/register", requireAuth, requireRole("admin"), patientController.registerPatient);

// ============================================
// PATIENT RETRIEVAL & UPDATE
// ============================================

/**
 * @route   GET /api/patients/:patientId
 * @desc    Get patient information by Smart Patient ID or Patient ID
 * @access  Doctor, Admin
 */
router.get("/:patientId", requireAuth, requireRole("doctor", "admin"), patientController.getPatient);

/**
 * @route   PUT /api/patients/:patientId
 * @desc    Update patient information
 * @access  Doctor, Admin
 */
router.put("/:patientId", requireAuth, requireRole("doctor", "admin"), patientController.updatePatient);

// ============================================
// MEDICAL VISITS ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/visits
 * @desc    Record a new medical visit for patient
 * @access  Doctor, Admin
 */
router.post("/:patientId/visits", requireAuth, requireRole("doctor", "admin"), patientController.addMedicalVisit);

/**
 * @route   GET /api/patients/:patientId/visits
 * @desc    Get all medical visits for a patient
 * @access  Doctor, Admin
 */
router.get("/:patientId/visits", requireAuth, requireRole("doctor", "admin"), patientController.getPatientVisits);

// ============================================
// DIAGNOSTIC REPORTS ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/reports
 * @desc    Add a diagnostic report for patient
 * @access  Doctor, Admin
 */
router.post("/:patientId/reports", requireAuth, requireRole("doctor", "admin"), patientController.addDiagnosticReport);

/**
 * @route   GET /api/patients/:patientId/reports
 * @desc    Get all diagnostic reports for a patient
 * @access  Doctor, Admin
 */
router.get("/:patientId/reports", requireAuth, requireRole("doctor", "admin"), patientController.getPatientReports);

// ============================================
// PRESCRIPTIONS ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/prescriptions
 * @desc    Add a new prescription for patient
 * @access  Doctor, Admin
 */
router.post("/:patientId/prescriptions", requireAuth, requireRole("doctor", "admin"), patientController.addPrescription);

/**
 * @route   GET /api/patients/:patientId/prescriptions
 * @desc    Get prescriptions for a patient
 * @access  Doctor, Admin
 */
router.get("/:patientId/prescriptions", requireAuth, requireRole("doctor", "admin"), patientController.getPatientPrescriptions);

// ============================================
// TREATMENT TIMELINE ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/timeline
 * @desc    Add entry to patient's treatment timeline
 * @access  Doctor, Admin
 */
router.post("/:patientId/timeline", requireAuth, requireRole("doctor", "admin"), patientController.addTreatmentTimeline);

/**
 * @route   GET /api/patients/:patientId/timeline
 * @desc    Get patient's complete treatment timeline
 * @access  Doctor, Admin
 */
router.get("/:patientId/timeline", requireAuth, requireRole("doctor", "admin"), patientController.getPatientTimeline);

// ============================================
// ACCESS CONTROL ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/access/grant
 * @desc    Grant a doctor access to patient records
 * @access  Admin
 */
router.post("/:patientId/access/grant", requireAuth, requireRole("admin"), patientController.grantDoctorAccess);

/**
 * @route   GET /api/patients/:patientId/access
 * @desc    Get list of doctors with access to patient records
 * @access  Doctor, Admin
 */
router.get("/:patientId/access", requireAuth, requireRole("doctor", "admin"), patientController.getPatientAccessList);

/**
 * @route   DELETE /api/patients/:patientId/access/:doctorId
 * @desc    Revoke doctor access to patient records
 * @access  Admin
 */
router.delete("/:patientId/access/:doctorId", requireAuth, requireRole("admin"), patientController.revokeDoctorAccess);

// ============================================
// COMPLETE MEDICAL HISTORY ROUTES
// ============================================

/**
 * @route   GET /api/patients/:patientId/complete-history
 * @desc    Get complete medical history (all records) for a patient
 * @access  Doctor, Admin
 */
router.get("/:patientId/complete-history", requireAuth, requireRole("doctor", "admin"), patientController.getCompleteMedicalHistory);

/**
 * @route   GET /api/patients/:patientId/summary  (AI summary by phone)
 * @desc    Get AI-generated patient history summary
 * @access  Doctor, Admin
 */
router.get("/:phone/summary", requireAuth, requireRole("doctor", "admin"), patientController.getPatientSummary);

/**
 * @route   POST /api/patients/:patientId/audit-log
 * @desc    Log access to patient medical records (audit trail)
 * @access  Doctor, Admin
 */
router.post("/:patientId/audit-log", requireAuth, requireRole("doctor", "admin"), patientController.logMedicalAccess);

/**
 * @route   DELETE /api/patients/:patientId
 * @desc    Delete patient record and all related medical data
 * @access  Patient (own records), Admin
 */
router.delete("/:patientId", requireAuth, patientController.deletePatientRecord);

module.exports = router;
