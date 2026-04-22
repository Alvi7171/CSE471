/**
 * Patient Management Routes
 * REST API endpoints for patient registration, medical history, and access control
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */
const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");

// Dev_Ornov Routes (commented out - functions not implemented)
// router.get("/", patientController.getAllPatients);
// router.get("/phone/:phone/timeline", patientController.getPatientTimelineByPhone);
// router.get("/phone/:phone/summary", patientController.getPatientSummary);

// ============================================
// PATIENT REGISTRATION ROUTES
// ============================================

/**
 * @route   POST /api/patients/register
 * @desc    Register a new patient with smart patient ID
 * @body    {
 *   firstName, lastName, dateOfBirth, gender (Male/Female/Other),
 *   bloodType (optional), phoneNumber, email (optional),
 *   address, city, stateProvince, postalCode, country,
 *   emergencyContactName, emergencyContactPhone,
 *   nationalId (optional), allergies, chronicDiseases, currentMedications
 * }
 * @access  Public
 */
router.post("/register", patientController.registerPatient);

/**
 * @route   GET /api/patients/:patientId
 * @desc    Get patient information by Smart Patient ID or Patient ID
 * @params  patientId (Can be SPC-XXXXX or numeric ID)
 * @access  Public (should be protected in production)
 */
router.get("/:patientId", patientController.getPatient);

/**
 * @route   PUT /api/patients/:patientId
 * @desc    Update patient information
 * @params  patientId
 * @body    {fields to update}
 * @access  Public (should be protected in production)
 */
router.put("/:patientId", patientController.updatePatient);

// ============================================
// MEDICAL VISITS ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/visits
 * @desc    Record a new medical visit for patient
 * @params  patientId
 * @body    {
 *   doctorId, appointmentId (optional), visitDate, visitReason,
 *   chiefComplaint, vitalSigns (JSON), diagnosis, clinicalNotes,
 *   status, followUpRequired, followUpDate
 * }
 * @access  Public (should be doctor-only in production)
 */
router.post("/:patientId/visits", patientController.addMedicalVisit);

/**
 * @route   GET /api/patients/:patientId/visits
 * @desc    Get all medical visits for a patient
 * @params  patientId
 * @access  Public (should be protected in production)
 */
router.get("/:patientId/visits", patientController.getPatientVisits);

// ============================================
// DIAGNOSTIC REPORTS ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/reports
 * @desc    Add a diagnostic report for patient
 * @params  patientId
 * @body    {
 *   doctorId, visitId (optional), reportType (Blood Test, X-Ray, ECG, etc.),
 *   testName, reportDate, labName, results (JSON), referenceValues,
 *   abnormalities, urgencyLevel (Normal/Abnormal/Critical),
 *   interpretation
 * }
 * @access  Public (should be doctor-only in production)
 */
router.post("/:patientId/reports", patientController.addDiagnosticReport);

/**
 * @route   GET /api/patients/:patientId/reports
 * @desc    Get all diagnostic reports for a patient
 * @params  patientId
 * @access  Public (should be protected in production)
 */
router.get("/:patientId/reports", patientController.getPatientReports);

// ============================================
// PRESCRIPTIONS ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/prescriptions
 * @desc    Add a new prescription for patient
 * @params  patientId
 * @body    {
 *   doctorId, visitId (optional), prescriptionDate, medicationName,
 *   dosage, frequency, duration, route (Oral/Injection/Topical/Inhalation/Rectal),
 *   instructions, refillsAllowed, expiryDate, pharmacyName
 * }
 * @access  Public (should be doctor-only in production)
 */
router.post("/:patientId/prescriptions", patientController.addPrescription);

/**
 * @route   GET /api/patients/:patientId/prescriptions
 * @desc    Get prescriptions for a patient
 * @params  patientId
 * @query   activeOnly (boolean) - Get only active prescriptions
 * @access  Public (should be protected in production)
 */
router.get(
  "/:patientId/prescriptions",
  patientController.getPatientPrescriptions,
);

// ============================================
// TREATMENT TIMELINE ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/timeline
 * @desc    Add entry to patient's treatment timeline
 * @params  patientId
 * @body    {
 *   doctorId (optional), treatmentDate, treatmentType,
 *   treatmentName, treatmentDescription, duration,
 *   status (scheduled/ongoing/completed/cancelled/paused),
 *   outcome, notes
 * }
 * @access  Public (should be doctor-only in production)
 */
router.post("/:patientId/timeline", patientController.addTreatmentTimeline);

/**
 * @route   GET /api/patients/:patientId/timeline
 * @desc    Get patient's complete treatment timeline
 * @params  patientId
 * @access  Public (should be protected in production)
 */
router.get("/:patientId/timeline", patientController.getPatientTimeline);

// ============================================
// ACCESS CONTROL ROUTES
// ============================================

/**
 * @route   POST /api/patients/:patientId/access/grant
 * @desc    Grant a doctor access to patient records
 * @params  patientId
 * @body    {doctorId, accessLevel (view/edit/full/limited), accessReason}
 * @access  Public (should be patient/admin-only in production)
 */
router.post("/:patientId/access/grant", patientController.grantDoctorAccess);

/**
 * @route   GET /api/patients/:patientId/access
 * @desc    Get list of doctors with access to patient records
 * @params  patientId
 * @access  Public (should be patient/doctor-only in production)
 */
router.get("/:patientId/access", patientController.getPatientAccessList);

/**
 * @route   DELETE /api/patients/:patientId/access/:doctorId
 * @desc    Revoke doctor access to patient records
 * @params  patientId, doctorId
 * @access  Public (should be patient/admin-only in production)
 */
router.delete(
  "/:patientId/access/:doctorId",
  patientController.revokeDoctorAccess,
);

// ============================================
// COMPLETE MEDICAL HISTORY ROUTES
// ============================================

/**
 * @route   GET /api/patients/:patientId/complete-history
 * @desc    Get complete medical history (all records) for a patient
 * @params  patientId
 * @access  Public (should be doctor/patient-only in production)
 */
router.get(
  "/:patientId/complete-history",
  patientController.getCompleteMedicalHistory,
);

/**
 * @route   POST /api/patients/:patientId/audit-log
 * @desc    Log access to patient medical records (audit trail)
 * @params  patientId
 * @body    {doctorId, actionType, recordType, recordId (optional)}
 * @access  Public (should be automatic in production)
 */
router.post("/:patientId/audit-log", patientController.logMedicalAccess);

module.exports = router;
