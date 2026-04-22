/**
 * Patient Management Controller
 * Handles patient registration, medical history, prescriptions, diagnostic reports, and treatment timeline
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */

const { db } = require("../config/database");
const crypto = require("crypto");

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate unique Smart Patient ID
 * Format: SPC-XXXXXX (SPC = SmartPatientCare, followed by 6 random alphanumeric chars)
 */
const generateSmartPatientID = () => {
  const randomChars = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()
    .slice(0, 8);
  return `SPC-${randomChars}`;
};

/**
 * Initialize patient tables if they don't exist
 */
const initializePatientTables = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
        smart_patient_id TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
        blood_type TEXT,
        phone_number TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        address TEXT,
        city TEXT,
        state_province TEXT,
        postal_code TEXT,
        country TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        national_id TEXT UNIQUE,
        allergies TEXT,
        chronic_diseases TEXT,
        current_medications TEXT,
        registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS medical_visits (
        visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_id INTEGER,
        visit_date TEXT NOT NULL,
        visit_reason TEXT NOT NULL,
        chief_complaint TEXT,
        vital_signs TEXT,
        diagnosis TEXT,
        clinical_notes TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        follow_up_required BOOLEAN DEFAULT 0,
        follow_up_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
      );

      CREATE TABLE IF NOT EXISTS diagnostic_reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        visit_id INTEGER,
        report_type TEXT NOT NULL,
        test_name TEXT NOT NULL,
        report_date TEXT NOT NULL,
        lab_name TEXT,
        results TEXT NOT NULL,
        reference_values TEXT,
        abnormalities TEXT,
        urgency_level TEXT,
        file_path TEXT,
        interpretation TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
      );

      CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        visit_id INTEGER,
        prescription_date TEXT NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        duration TEXT NOT NULL,
        route TEXT NOT NULL,
        instructions TEXT,
        refills_allowed INTEGER DEFAULT 0,
        refills_used INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        expiry_date TEXT,
        pharmacy_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
      );

      CREATE TABLE IF NOT EXISTS treatment_timeline (
        timeline_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER,
        treatment_date TEXT NOT NULL,
        treatment_type TEXT NOT NULL,
        treatment_name TEXT NOT NULL,
        treatment_description TEXT,
        duration TEXT,
        status TEXT NOT NULL DEFAULT 'ongoing',
        outcome TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS doctor_patient_access (
        access_id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        access_level TEXT NOT NULL DEFAULT 'view',
        access_reason TEXT,
        is_active BOOLEAN DEFAULT 1,
        granted_date TEXT DEFAULT CURRENT_TIMESTAMP,
        revoked_date TEXT,
        UNIQUE (doctor_id, patient_id),
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS medical_history_audit (
        audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        accessed_by_doctor_id INTEGER,
        action_type TEXT NOT NULL,
        record_type TEXT NOT NULL,
        record_id INTEGER,
        access_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
      );
    `);
    console.log("✅ Patient management tables initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing patient tables:", error.message);
  }
};

// Initialize tables on module load
initializePatientTables();

// ============================================
// PATIENT REGISTRATION ENDPOINTS
// ============================================

/**
 * Register a new patient
 * POST /api/patients/register
 */
exports.registerPatient = (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodType,
      phoneNumber,
      email,
      address,
      city,
      stateProvince,
      postalCode,
      country,
      emergencyContactName,
      emergencyContactPhone,
      nationalId,
      allergies,
      chronicDiseases,
      currentMedications,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !dateOfBirth || !gender || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: firstName, lastName, dateOfBirth, gender, phoneNumber",
      });
    }

    const smartPatientId = generateSmartPatientID();
    const registrationDate = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO patients (
        smart_patient_id, first_name, last_name, date_of_birth, gender, blood_type,
        phone_number, email, address, city, state_province, postal_code, country,
        emergency_contact_name, emergency_contact_phone, national_id,
        allergies, chronic_diseases, current_medications, registration_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      smartPatientId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodType || null,
      phoneNumber,
      email || null,
      address || null,
      city || null,
      stateProvince || null,
      postalCode || null,
      country || null,
      emergencyContactName || null,
      emergencyContactPhone || null,
      nationalId || null,
      allergies || null,
      chronicDiseases || null,
      currentMedications || null,
      registrationDate,
    );

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient: {
        patientId: result.lastInsertRowid,
        smartPatientId: smartPatientId,
        firstName,
        lastName,
        phoneNumber,
        email,
      },
    });
  } catch (error) {
    console.error("❌ Error registering patient:", error.message);

    // Handle specific database constraint errors
    let userMessage = "Error registering patient";
    if (error.message.includes("UNIQUE constraint failed: patients.phone_number")) {
      userMessage = "This phone number is already registered. Please use a different phone number.";
    } else if (error.message.includes("UNIQUE constraint failed: patients.email")) {
      userMessage = "This email is already registered. Please use a different email.";
    } else if (error.message.includes("UNIQUE constraint failed: patients.smart_patient_id")) {
      userMessage = "Smart Patient ID collision. Please try again.";
    } else if (error.message.includes("UNIQUE constraint failed: patients.national_id")) {
      userMessage = "This national ID is already registered.";
    } else if (error.message.includes("UNIQUE constraint failed")) {
      userMessage = "Duplicate data detected. Please check your information.";
    }

    res.status(500).json({
      success: false,
      message: userMessage,
      error: error.message,
    });
  }
};

/**
 * Get patient by Smart Patient ID or Patient ID
 * GET /api/patients/:patientId
 */
exports.getPatient = (req, res) => {
  try {
    const { patientId } = req.params;

    let stmt;
    if (patientId.startsWith("SPC-")) {
      // Search by Smart Patient ID
      stmt = db.prepare("SELECT * FROM patients WHERE smart_patient_id = ?");
    } else {
      // Search by Patient ID
      stmt = db.prepare("SELECT * FROM patients WHERE patient_id = ?");
    }

    const patient = stmt.get(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      patient: patient,
    });
  } catch (error) {
    console.error("Error fetching patient:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching patient",
      error: error.message,
    });
  }
};

/**
 * Update patient information
 * PUT /api/patients/:patientId
 */
exports.updatePatient = (req, res) => {
  try {
    const { patientId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = [
      "first_name",
      "last_name",
      "blood_type",
      "phone_number",
      "email",
      "address",
      "city",
      "state_province",
      "postal_code",
      "country",
      "emergency_contact_name",
      "emergency_contact_phone",
      "allergies",
      "chronic_diseases",
      "current_medications",
    ];

    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        fields.push(`${snakeKey} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }

    values.push(new Date().toISOString()); // last_updated
    values.push(patientId); // WHERE clause

    const stmt = db.prepare(
      `UPDATE patients SET ${fields.join(", ")}, last_updated = ? WHERE patient_id = ?`,
    );
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    res.json({
      success: true,
      message: "Patient updated successfully",
    });
  } catch (error) {
    console.error("Error updating patient:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating patient",
      error: error.message,
    });
  }
};

// ============================================
// MEDICAL VISITS ENDPOINTS
// ============================================

/**
 * Add medical visit record
 * POST /api/patients/:patientId/visits
 */
exports.addMedicalVisit = (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      doctorId,
      appointmentId,
      visitDate,
      visitReason,
      chiefComplaint,
      vitalSigns,
      diagnosis,
      clinicalNotes,
      status,
      followUpRequired,
      followUpDate,
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO medical_visits (
        patient_id, doctor_id, appointment_id, visit_date, visit_reason,
        chief_complaint, vital_signs, diagnosis, clinical_notes, status,
        follow_up_required, follow_up_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patientId,
      doctorId,
      appointmentId || null,
      visitDate,
      visitReason,
      chiefComplaint || null,
      vitalSigns ? JSON.stringify(vitalSigns) : null,
      diagnosis || null,
      clinicalNotes || null,
      status || "completed",
      followUpRequired ? 1 : 0,
      followUpDate || null,
    );

    res.status(201).json({
      success: true,
      message: "Medical visit recorded",
      visitId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Error adding visit:", error.message);
    res.status(500).json({
      success: false,
      message: "Error adding medical visit",
      error: error.message,
    });
  }
};

/**
 * Get all medical visits for a patient
 * GET /api/patients/:patientId/visits
 */
exports.getPatientVisits = (req, res) => {
  try {
    const { patientId } = req.params;

    const stmt = db.prepare(`
      SELECT mv.*, d.name as doctor_name, d.specialization
      FROM medical_visits mv
      LEFT JOIN doctors d ON mv.doctor_id = d.doctor_id
      WHERE mv.patient_id = ?
      ORDER BY mv.visit_date DESC
    `);

    const visits = stmt.all(patientId);

    res.json({
      success: true,
      visits: visits || [],
    });
  } catch (error) {
    console.error("Error fetching visits:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching medical visits",
      error: error.message,
    });
  }
};

// ============================================
// DIAGNOSTIC REPORTS ENDPOINTS
// ============================================

/**
 * Add diagnostic report
 * POST /api/patients/:patientId/reports
 */
exports.addDiagnosticReport = (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      doctorId,
      visitId,
      reportType,
      testName,
      reportDate,
      labName,
      results,
      referenceValues,
      abnormalities,
      urgencyLevel,
      interpretation,
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO diagnostic_reports (
        patient_id, doctor_id, visit_id, report_type, test_name, report_date,
        lab_name, results, reference_values, abnormalities, urgency_level, interpretation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patientId,
      doctorId,
      visitId || null,
      reportType,
      testName,
      reportDate,
      labName || null,
      JSON.stringify(results),
      referenceValues || null,
      abnormalities || null,
      urgencyLevel || "Normal",
      interpretation || null,
    );

    res.status(201).json({
      success: true,
      message: "Diagnostic report added",
      reportId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Error adding report:", error.message);
    res.status(500).json({
      success: false,
      message: "Error adding diagnostic report",
      error: error.message,
    });
  }
};

/**
 * Get all diagnostic reports for a patient
 * GET /api/patients/:patientId/reports
 */
exports.getPatientReports = (req, res) => {
  try {
    const { patientId } = req.params;

    const stmt = db.prepare(`
      SELECT dr.*, d.name as doctor_name
      FROM diagnostic_reports dr
      LEFT JOIN doctors d ON dr.doctor_id = d.doctor_id
      WHERE dr.patient_id = ?
      ORDER BY dr.report_date DESC
    `);

    const reports = stmt.all(patientId);

    res.json({
      success: true,
      reports: reports || [],
    });
  } catch (error) {
    console.error("Error fetching reports:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching diagnostic reports",
      error: error.message,
    });
  }
};

// ============================================
// PRESCRIPTIONS ENDPOINTS
// ============================================

/**
 * Add prescription
 * POST /api/patients/:patientId/prescriptions
 */
exports.addPrescription = (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      doctorId,
      visitId,
      prescriptionDate,
      medicationName,
      dosage,
      frequency,
      duration,
      route,
      instructions,
      refillsAllowed,
      expiryDate,
      pharmacyName,
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO prescriptions (
        patient_id, doctor_id, visit_id, prescription_date, medication_name,
        dosage, frequency, duration, route, instructions, refills_allowed,
        expiry_date, pharmacy_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patientId,
      doctorId,
      visitId || null,
      prescriptionDate,
      medicationName,
      dosage,
      frequency,
      duration,
      route,
      instructions || null,
      refillsAllowed || 0,
      expiryDate || null,
      pharmacyName || null,
    );

    res.status(201).json({
      success: true,
      message: "Prescription added",
      prescriptionId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Error adding prescription:", error.message);
    res.status(500).json({
      success: false,
      message: "Error adding prescription",
      error: error.message,
    });
  }
};

/**
 * Get active prescriptions for a patient
 * GET /api/patients/:patientId/prescriptions
 */
exports.getPatientPrescriptions = (req, res) => {
  try {
    const { patientId } = req.params;
    const { activeOnly } = req.query;

    let query = `
      SELECT p.*, d.name as doctor_name
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.patient_id = ?
    `;

    if (activeOnly === "true") {
      query += ` AND p.is_active = 1`;
    }

    query += ` ORDER BY p.prescription_date DESC`;

    const stmt = db.prepare(query);
    const prescriptions = stmt.all(patientId);

    res.json({
      success: true,
      prescriptions: prescriptions || [],
    });
  } catch (error) {
    console.error("Error fetching prescriptions:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching prescriptions",
      error: error.message,
    });
  }
};

// ============================================
// TREATMENT TIMELINE ENDPOINTS
// ============================================

/**
 * Add treatment timeline entry
 * POST /api/patients/:patientId/timeline
 */
exports.addTreatmentTimeline = (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      doctorId,
      treatmentDate,
      treatmentType,
      treatmentName,
      treatmentDescription,
      duration,
      status,
      outcome,
      notes,
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO treatment_timeline (
        patient_id, doctor_id, treatment_date, treatment_type, treatment_name,
        treatment_description, duration, status, outcome, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patientId,
      doctorId || null,
      treatmentDate,
      treatmentType,
      treatmentName,
      treatmentDescription || null,
      duration || null,
      status || "ongoing",
      outcome || null,
      notes || null,
    );

    res.status(201).json({
      success: true,
      message: "Treatment timeline entry added",
      timelineId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Error adding timeline entry:", error.message);
    res.status(500).json({
      success: false,
      message: "Error adding treatment timeline",
      error: error.message,
    });
  }
};

/**
 * Get patient treatment timeline
 * GET /api/patients/:patientId/timeline
 */
exports.getPatientTimeline = (req, res) => {
  try {
    const { patientId } = req.params;

    const stmt = db.prepare(`
      SELECT tt.*, d.name as doctor_name
      FROM treatment_timeline tt
      LEFT JOIN doctors d ON tt.doctor_id = d.doctor_id
      WHERE tt.patient_id = ?
      ORDER BY tt.treatment_date DESC
    `);

    const timeline = stmt.all(patientId);

    res.json({
      success: true,
      timeline: timeline || [],
    });
  } catch (error) {
    console.error("Error fetching timeline:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching treatment timeline",
      error: error.message,
    });
  }
};

// ============================================
// DOCTOR-PATIENT ACCESS CONTROL ENDPOINTS
// ============================================

/**
 * Grant doctor access to patient records
 * POST /api/patients/:patientId/access/grant
 */
exports.grantDoctorAccess = (req, res) => {
  try {
    const { patientId } = req.params;
    const { doctorId, accessLevel, accessReason } = req.body;

    const stmt = db.prepare(`
      INSERT INTO doctor_patient_access (doctor_id, patient_id, access_level, access_reason)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(doctor_id, patient_id) DO UPDATE SET
        access_level = excluded.access_level,
        access_reason = excluded.access_reason,
        is_active = 1,
        revoked_date = NULL
    `);

    stmt.run(patientId, doctorId, accessLevel || "view", accessReason || null);

    res.status(201).json({
      success: true,
      message: "Doctor access granted",
    });
  } catch (error) {
    console.error("Error granting access:", error.message);
    res.status(500).json({
      success: false,
      message: "Error granting doctor access",
      error: error.message,
    });
  }
};

/**
 * Get doctors with access to patient records
 * GET /api/patients/:patientId/access
 */
exports.getPatientAccessList = (req, res) => {
  try {
    const { patientId } = req.params;

    const stmt = db.prepare(`
      SELECT dpa.*, d.name as doctor_name, d.specialization, d.email
      FROM doctor_patient_access dpa
      LEFT JOIN doctors d ON dpa.doctor_id = d.doctor_id
      WHERE dpa.patient_id = ? AND dpa.is_active = 1
      ORDER BY dpa.granted_date DESC
    `);

    const accessList = stmt.all(patientId);

    res.json({
      success: true,
      accessList: accessList || [],
    });
  } catch (error) {
    console.error("Error fetching access list:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching access list",
      error: error.message,
    });
  }
};

/**
 * Revoke doctor access to patient records
 * DELETE /api/patients/:patientId/access/:doctorId
 */
exports.revokeDoctorAccess = (req, res) => {
  try {
    const { patientId, doctorId } = req.params;

    const stmt = db.prepare(`
      UPDATE doctor_patient_access
      SET is_active = 0, revoked_date = ?
      WHERE patient_id = ? AND doctor_id = ?
    `);

    stmt.run(new Date().toISOString(), patientId, doctorId);

    res.json({
      success: true,
      message: "Doctor access revoked",
    });
  } catch (error) {
    console.error("Error revoking access:", error.message);
    res.status(500).json({
      success: false,
      message: "Error revoking doctor access",
      error: error.message,
    });
  }
};

// ============================================
// COMPLETE MEDICAL HISTORY ENDPOINT
// ============================================

/**
 * Get complete medical history for a patient
 * GET /api/patients/:patientId/complete-history
 */
exports.getCompleteMedicalHistory = (req, res) => {
  try {
    const { patientId } = req.params;

    // Get patient info - support both Smart Patient ID and regular Patient ID
    let patientStmt;
    if (patientId.startsWith("SPC-")) {
      // Search by Smart Patient ID
      patientStmt = db.prepare("SELECT * FROM patients WHERE smart_patient_id = ?");
    } else {
      // Search by Patient ID
      patientStmt = db.prepare("SELECT * FROM patients WHERE patient_id = ?");
    }
    const patient = patientStmt.get(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Use the actual patient_id for all subsequent queries
    const actualPatientId = patient.patient_id;

    // Get visits
    const visitsStmt = db.prepare(`
      SELECT mv.*, d.name as doctor_name, d.specialization
      FROM medical_visits mv
      LEFT JOIN doctors d ON mv.doctor_id = d.doctor_id
      WHERE mv.patient_id = ?
      ORDER BY mv.visit_date DESC
    `);
    const visits = visitsStmt.all(actualPatientId);

    // Get reports
    const reportsStmt = db.prepare(`
      SELECT dr.*, d.name as doctor_name
      FROM diagnostic_reports dr
      LEFT JOIN doctors d ON dr.doctor_id = d.doctor_id
      WHERE dr.patient_id = ?
      ORDER BY dr.report_date DESC
    `);
    const reports = reportsStmt.all(actualPatientId);

    // Get prescriptions
    const prescriptionsStmt = db.prepare(`
      SELECT p.*, d.name as doctor_name
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.patient_id = ?
      ORDER BY p.prescription_date DESC
    `);
    const prescriptions = prescriptionsStmt.all(actualPatientId);

    // Get timeline
    const timelineStmt = db.prepare(`
      SELECT tt.*, d.name as doctor_name
      FROM treatment_timeline tt
      LEFT JOIN doctors d ON tt.doctor_id = d.doctor_id
      WHERE tt.patient_id = ?
      ORDER BY tt.treatment_date DESC
    `);
    const timeline = timelineStmt.all(actualPatientId);

    res.json({
      success: true,
      medicalHistory: {
        patient,
        visits,
        diagnosticReports: reports,
        prescriptions,
        treatmentTimeline: timeline,
      },
    });
  } catch (error) {
    console.error("Error fetching complete medical history:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching medical history",
      error: error.message,
    });
  }
};

/**
 * Log medical record access (for audit)
 * POST /api/patients/:patientId/audit-log
 */
exports.logMedicalAccess = (req, res) => {
  try {
    const { patientId } = req.params;
    const { doctorId, actionType, recordType, recordId } = req.body;

    const stmt = db.prepare(`
      INSERT INTO medical_history_audit (
        patient_id, accessed_by_doctor_id, action_type, record_type, record_id
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(patientId, doctorId || null, actionType, recordType, recordId || null);

    res.json({
      success: true,
      message: "Access logged",
    });
  } catch (error) {
    console.error("Error logging access:", error.message);
    res.status(500).json({
      success: false,
      message: "Error logging access",
      error: error.message,
    });
  }
};

// ============================================
// AI PATIENT SUMMARY ENDPOINT
// ============================================

const { generatePatientSummary } = require("../utils/aiService");

/**
 * Get AI-generated patient history summary
 * GET /api/patients/phone/:phone/summary
 */
exports.getPatientSummary = async (req, res) => {
  try {
    const { phone } = req.params;

    // Find patient by phone
    const patientStmt = db.prepare("SELECT * FROM patients WHERE phone_number = ?");
    const patient = patientStmt.get(phone);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found with this phone number",
      });
    }

    const patientId = patient.patient_id;

    // Get all medical data for timeline
    const visitsStmt = db.prepare(`
      SELECT mv.*, d.name as doctor_name, d.specialization
      FROM medical_visits mv
      LEFT JOIN doctors d ON mv.doctor_id = d.doctor_id
      WHERE mv.patient_id = ?
      ORDER BY mv.visit_date DESC
      LIMIT 20
    `);
    const visits = visitsStmt.all(patientId);

    const reportsStmt = db.prepare(`
      SELECT dr.*, d.name as doctor_name
      FROM diagnostic_reports dr
      LEFT JOIN doctors d ON dr.doctor_id = d.doctor_id
      WHERE dr.patient_id = ?
      ORDER BY dr.report_date DESC
      LIMIT 20
    `);
    const reports = reportsStmt.all(patientId);

    const prescriptionsStmt = db.prepare(`
      SELECT p.*, d.name as doctor_name
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.patient_id = ?
      ORDER BY p.prescription_date DESC
      LIMIT 20
    `);
    const prescriptions = prescriptionsStmt.all(patientId);

    const timelineStmt = db.prepare(`
      SELECT tt.*, d.name as doctor_name
      FROM treatment_timeline tt
      LEFT JOIN doctors d ON tt.doctor_id = d.doctor_id
      WHERE tt.patient_id = ?
      ORDER BY tt.treatment_date DESC
      LIMIT 20
    `);
    const timeline = timelineStmt.all(patientId);

    // Prepare patient info
    const patientInfo = {
      name: `${patient.first_name} ${patient.last_name}`,
      age: patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null,
      gender: patient.gender,
      bloodType: patient.blood_type,
      allergies: patient.allergies,
      chronicDiseases: patient.chronic_diseases,
      currentMedications: patient.current_medications,
    };

    // Build timeline data array
    const timelineData = [
      ...visits.map(v => ({ type: 'visit', date: v.visit_date, data: v })),
      ...reports.map(r => ({ type: 'report', date: r.report_date, data: r })),
      ...prescriptions.map(p => ({ type: 'prescription', date: p.prescription_date, data: p })),
      ...timeline.map(t => ({ type: 'treatment', date: t.treatment_date, data: t }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Call AI service to generate summary
    const aiResult = await generatePatientSummary(patientInfo, timelineData);

    if (aiResult.success) {
      res.json({
        success: true,
        summary: aiResult.summary,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to generate AI summary",
        error: aiResult.error,
      });
    }
  } catch (error) {
    console.error("Error generating patient summary:", error.message);
    res.status(500).json({
      success: false,
      message: "Error generating patient summary",
      error: error.message,
    });
  }
};
