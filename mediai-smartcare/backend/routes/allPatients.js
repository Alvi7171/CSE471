/**
 * Public endpoint to get all patients for medical timeline
 * No authentication required
 */
const express = require("express");
const router = express.Router();
const { db } = require("../config/database");

/**
 * GET /api/all-patients
 * Get all patients (registered + lab test patients)
 * Access: Public
 */
router.get("/", (req, res) => {
  try {
    // Get all patients from unified table (includes all sources)
    const allPatients = db.prepare(`
      SELECT patient_id, smart_patient_id, first_name, last_name, gender, 
             blood_type, phone_number, email, registration_date, 'registered' as source
      FROM patients 
      ORDER BY registration_date DESC
    `).all();

    res.json({
      success: true,
      data: allPatients,
      count: allPatients.length
    });
  } catch (error) {
    console.error("Error fetching all patients:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch patients"
    });
  }
});

/**
 * GET /api/all-patients/doctors
 * Get all doctors for emergency response
 * Access: Public
 */
router.get("/doctors", (req, res) => {
  try {
    const doctors = db.prepare(`
      SELECT doctor_id, name, specialization, degree, department, 
             consultation_fee, is_available, phone, email
      FROM doctors 
      WHERE is_available = 1
      ORDER BY name
    `).all();

    res.json({
      success: true,
      doctors: doctors
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch doctors"
    });
  }
});

/**
 * DELETE /api/all-patients/:patientId
 * Delete a patient permanently from all sources
 * Access: Public (for now, should be restricted to admin in production)
 */
router.delete("/:patientId", (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: "Patient ID is required"
      });
    }

    // Get patient info before deletion for logging
    const patientInfo = db.prepare(`
      SELECT *, 'registered' as source FROM patients WHERE patient_id = ?
    `).get(patientId);

    if (!patientInfo) {
      return res.status(404).json({
        success: false,
        error: "Patient not found"
      });
    }

    console.log(`Deleting patient ${patientId} (${patientInfo.first_name} ${patientInfo.last_name}) from source: ${patientInfo.source}`);

    // Delete from appropriate source based on patient origin
    let deletedFrom = [];
    
    if (patientInfo.source === 'registered') {
      // Delete from patients table
      const result1 = db.prepare('DELETE FROM patients WHERE patient_id = ?').run(patientId);
      if (result1.changes > 0) deletedFrom.push('patients');
      
      // Also delete from users table if user account exists
      const result2 = db.prepare('DELETE FROM users WHERE full_name LIKE ? OR phone = ?').run(`${patientInfo.first_name} ${patientInfo.last_name}`, patientInfo.phone_number);
      if (result2.changes > 0) deletedFrom.push('users');
      
      // Delete related medical records
      const result3 = db.prepare('DELETE FROM medical_visits WHERE patient_id = ?').run(patientId);
      if (result3.changes > 0) deletedFrom.push('medical_visits');
      
      const result4 = db.prepare('DELETE FROM prescriptions WHERE patient_id = ?').run(patientId);
      if (result4.changes > 0) deletedFrom.push('prescriptions');
      
      const result5 = db.prepare('DELETE FROM diagnostic_reports WHERE patient_id = ?').run(patientId);
      if (result5.changes > 0) deletedFrom.push('diagnostic_reports');
      
    } else if (patientInfo.source === 'lab_test') {
      // Delete from lab_tests table
      const result = db.prepare('DELETE FROM lab_tests WHERE patient_id = ?').run(patientId);
      if (result.changes > 0) deletedFrom.push('lab_tests');
      
    } else if (patientInfo.source === 'emergency') {
      // Delete from emergency_cases table
      const result = db.prepare('DELETE FROM emergency_cases WHERE emergency_id = ?').run(patientId);
      if (result.changes > 0) deletedFrom.push('emergency_cases');
    }

    res.json({
      success: true,
      message: "Patient deleted permanently",
      deletedFrom: deletedFrom,
      patientInfo: {
        id: patientInfo.patient_id,
        name: `${patientInfo.first_name} ${patientInfo.last_name}`,
        source: patientInfo.source
      }
    });

  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete patient",
      details: error.message
    });
  }
});

module.exports = router;
