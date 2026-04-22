/**
 * Laboratory Test & Emergency Response Controller
 * Handles lab test requests, results, reports, and emergency response management
 */

const { db } = require("../config/database");

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Initialize lab and emergency tables
 */
const initializeLabEmergencyTables = () => {
  try {
    db.exec(`
      -- Laboratory Tests Table
      CREATE TABLE IF NOT EXISTS lab_tests (
        test_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_id INTEGER,
        test_type TEXT NOT NULL,
        test_name TEXT NOT NULL,
        priority TEXT DEFAULT 'Normal' CHECK(priority IN ('Normal', 'Urgent', 'Emergency')),
        status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Sample Collected', 'In Progress', 'Completed', 'Cancelled')),
        request_date TEXT NOT NULL,
        scheduled_date TEXT,
        collected_date TEXT,
        completed_date TEXT,
        lab_name TEXT,
        cost REAL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
      );

      -- Lab Test Results Table
      CREATE TABLE IF NOT EXISTS lab_results (
        result_id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        parameter_name TEXT NOT NULL,
        value TEXT NOT NULL,
        unit TEXT,
        reference_range TEXT,
        is_abnormal BOOLEAN DEFAULT 0,
        abnormality_level TEXT CHECK(abnormality_level IN ('Low', 'High', 'Critical')),
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES lab_tests(test_id) ON DELETE CASCADE
      );

      -- Lab Reports Table
      CREATE TABLE IF NOT EXISTS lab_reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        report_type TEXT NOT NULL,
        report_date TEXT NOT NULL,
        lab_technician TEXT,
        reviewed_by INTEGER,
        reviewed_date TEXT,
        file_path TEXT,
        summary TEXT,
        interpretation TEXT,
        is_delivered BOOLEAN DEFAULT 0,
        delivered_date TEXT,
        delivered_to TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES lab_tests(test_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES doctors(doctor_id)
      );

      -- Emergency Cases Table
      CREATE TABLE IF NOT EXISTS emergency_cases (
        emergency_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        patient_name TEXT NOT NULL,
        patient_phone TEXT,
        patient_age INTEGER,
        patient_gender TEXT,
        emergency_type TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('Critical', 'High', 'Medium', 'Low')),
        triage_category TEXT CHECK(triage_category IN ('Resuscitation', 'Emergency', 'Urgent', 'Less Urgent')),
        arrival_time TEXT NOT NULL,
        status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'In Treatment', 'Admitted', 'Discharged', 'Transferred', 'Deceased')),
        location TEXT,
        chief_complaint TEXT,
        vital_signs TEXT,
        initial_assessment TEXT,
        assigned_doctor_id INTEGER,
        assigned_nurse_id INTEGER,
        treatment_given TEXT,
        outcome TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Emergency Alerts Table
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
        emergency_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('New Emergency', 'Critical Patient', 'Doctor Assignment', 'Status Update', 'Bed Required', 'Equipment Required')),
        message TEXT NOT NULL,
        priority TEXT DEFAULT 'High' CHECK(priority IN ('Critical', 'High', 'Medium', 'Low')),
        is_read BOOLEAN DEFAULT 0,
        sent_to TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (emergency_id) REFERENCES emergency_cases(emergency_id) ON DELETE CASCADE
      );

      -- Emergency Response Team Table
      CREATE TABLE IF NOT EXISTS emergency_team (
        team_id INTEGER PRIMARY KEY AUTOINCREMENT,
        emergency_id INTEGER NOT NULL,
        team_member_id INTEGER NOT NULL,
        member_role TEXT NOT NULL CHECK(member_role IN ('Lead Doctor', 'Assisting Doctor', 'Nurse', 'Technician')),
        assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Completed', 'Released')),
        FOREIGN KEY (emergency_id) REFERENCES emergency_cases(emergency_id) ON DELETE CASCADE
      );
    `);
    console.log("✅ Lab & Emergency tables initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing lab & emergency tables:", error.message);
  }
};

// Initialize tables on module load
initializeLabEmergencyTables();

// ============================================
// LAB TEST MANAGEMENT ENDPOINTS
// ============================================

/**
 * Create a new lab test request
 * POST /api/lab/tests
 */
exports.createLabTest = (req, res) => {
  try {
    const {
      patientId, doctorId, appointmentId, testType, testName,
      priority, scheduledDate, labName, cost, notes
    } = req.body;

    if (!patientId || !doctorId || !testType || !testName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: patientId, doctorId, testType, testName"
      });
    }

    const stmt = db.prepare(`
      INSERT INTO lab_tests (
        patient_id, doctor_id, appointment_id, test_type, test_name,
        priority, status, request_date, scheduled_date, lab_name, cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patientId, doctorId, appointmentId || null, testType, testName,
      priority || 'Normal', new Date().toISOString(), scheduledDate || null,
      labName || null, cost || null, notes || null
    );

    res.status(201).json({
      success: true,
      message: "Lab test request created successfully",
      testId: result.lastInsertRowid
    });
  } catch (error) {
    console.error("Error creating lab test:", error.message);
    res.status(500).json({
      success: false,
      message: "Error creating lab test request",
      error: error.message
    });
  }
};

/**
 * Get all lab tests (with filters)
 * GET /api/lab/tests
 */
exports.getLabTests = (req, res) => {
  try {
    const { patientId, status, priority, fromDate, toDate } = req.query;

    let query = `
      SELECT lt.*, p.first_name, p.last_name, p.phone_number,
             d.name as doctor_name, d.specialization
      FROM lab_tests lt
      LEFT JOIN patients p ON lt.patient_id = p.patient_id
      LEFT JOIN doctors d ON lt.doctor_id = d.doctor_id
      WHERE 1=1
    `;
    const params = [];

    if (patientId) {
      query += " AND lt.patient_id = ?";
      params.push(patientId);
    }
    if (status) {
      query += " AND lt.status = ?";
      params.push(status);
    }
    if (priority) {
      query += " AND lt.priority = ?";
      params.push(priority);
    }
    if (fromDate) {
      query += " AND lt.request_date >= ?";
      params.push(fromDate);
    }
    if (toDate) {
      query += " AND lt.request_date <= ?";
      params.push(toDate);
    }

    query += " ORDER BY lt.request_date DESC";

    const stmt = db.prepare(query);
    const tests = stmt.all(...params);

    res.json({
      success: true,
      tests: tests || []
    });
  } catch (error) {
    console.error("Error fetching lab tests:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching lab tests",
      error: error.message
    });
  }
};

/**
 * Get lab test by ID
 * GET /api/lab/tests/:testId
 */
exports.getLabTestById = (req, res) => {
  try {
    const { testId } = req.params;

    const testStmt = db.prepare(`
      SELECT lt.*, p.first_name, p.last_name, p.phone_number, p.date_of_birth, p.gender,
             d.name as doctor_name, d.specialization
      FROM lab_tests lt
      LEFT JOIN patients p ON lt.patient_id = p.patient_id
      LEFT JOIN doctors d ON lt.doctor_id = d.doctor_id
      WHERE lt.test_id = ?
    `);
    const test = testStmt.get(testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found"
      });
    }

    // Get results
    const resultsStmt = db.prepare("SELECT * FROM lab_results WHERE test_id = ?");
    const results = resultsStmt.all(testId);

    // Get report
    const reportStmt = db.prepare("SELECT * FROM lab_reports WHERE test_id = ? ORDER BY report_date DESC LIMIT 1");
    const report = reportStmt.get(testId);

    res.json({
      success: true,
      test,
      results,
      report
    });
  } catch (error) {
    console.error("Error fetching lab test:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching lab test",
      error: error.message
    });
  }
};

/**
 * Update lab test status
 * PUT /api/lab/tests/:testId/status
 */
exports.updateLabTestStatus = (req, res) => {
  try {
    const { testId } = req.params;
    const { status, collectedDate, completedDate } = req.body;

    const validStatuses = ['Pending', 'Sample Collected', 'In Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    let query = "UPDATE lab_tests SET status = ?, updated_at = ?";
    const params = [status, new Date().toISOString()];

    if (status === 'Sample Collected' && collectedDate) {
      query += ", collected_date = ?";
      params.push(collectedDate);
    }
    if (status === 'Completed' && completedDate) {
      query += ", completed_date = ?";
      params.push(completedDate);
    }

    query += " WHERE test_id = ?";
    params.push(testId);

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found"
      });
    }

    res.json({
      success: true,
      message: "Lab test status updated"
    });
  } catch (error) {
    console.error("Error updating lab test status:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating lab test status",
      error: error.message
    });
  }
};

/**
 * Add lab test results
 * POST /api/lab/tests/:testId/results
 */
exports.addLabResults = (req, res) => {
  try {
    const { testId } = req.params;
    const { results } = req.body; // Array of { parameterName, value, unit, referenceRange, isAbnormal, abnormalityLevel, notes }

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: "Results array is required"
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO lab_results (test_id, parameter_name, value, unit, reference_range, is_abnormal, abnormality_level, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((results) => {
      for (const r of results) {
        insertStmt.run(
          testId, r.parameterName, r.value, r.unit || null,
          r.referenceRange || null, r.isAbnormal ? 1 : 0,
          r.abnormalityLevel || null, r.notes || null
        );
      }
    });

    insertMany(results);

    // Update test status to In Progress if not already
    db.prepare("UPDATE lab_tests SET status = 'In Progress' WHERE test_id = ? AND status = 'Sample Collected'").run(testId);

    res.status(201).json({
      success: true,
      message: "Lab results added successfully",
      resultCount: results.length
    });
  } catch (error) {
    console.error("Error adding lab results:", error.message);
    res.status(500).json({
      success: false,
      message: "Error adding lab results",
      error: error.message
    });
  }
};

/**
 * Generate lab report
 * POST /api/lab/tests/:testId/report
 */
exports.generateLabReport = (req, res) => {
  try {
    const { testId } = req.params;
    const { reportType, labTechnician, reviewedBy, summary, interpretation } = req.body;

    // Get test details
    const testStmt = db.prepare("SELECT * FROM lab_tests WHERE test_id = ?");
    const test = testStmt.get(testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found"
      });
    }

    // Get results
    const resultsStmt = db.prepare("SELECT * FROM lab_results WHERE test_id = ?");
    const results = resultsStmt.all(testId);

    // Check for critical abnormalities
    const criticalResults = results.filter(r => r.abnormality_level === 'Critical');
    const hasCritical = criticalResults.length > 0;

    const stmt = db.prepare(`
      INSERT INTO lab_reports (
        test_id, report_type, report_date, lab_technician, reviewed_by,
        summary, interpretation, is_delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const result = stmt.run(
      testId,
      reportType || 'Complete Blood Count',
      new Date().toISOString(),
      labTechnician || null,
      reviewedBy || null,
      summary || `Test completed with ${results.length} parameters analyzed.${hasCritical ? ' CRITICAL VALUES DETECTED - Immediate doctor review required.' : ''}`,
      interpretation || null
    );

    // Update test status to Completed
    db.prepare("UPDATE lab_tests SET status = 'Completed', completed_date = ? WHERE test_id = ?")
      .run(new Date().toISOString(), testId);

    res.status(201).json({
      success: true,
      message: "Lab report generated successfully",
      reportId: result.lastInsertRowid,
      hasCriticalValues: hasCritical
    });
  } catch (error) {
    console.error("Error generating lab report:", error.message);
    res.status(500).json({
      success: false,
      message: "Error generating lab report",
      error: error.message
    });
  }
};

/**
 * Deliver lab report to patient/doctor
 * PUT /api/lab/reports/:reportId/deliver
 */
exports.deliverLabReport = (req, res) => {
  try {
    const { reportId } = req.params;
    const { deliveredTo } = req.body;

    const stmt = db.prepare(`
      UPDATE lab_reports SET is_delivered = 1, delivered_date = ?, delivered_to = ?
      WHERE report_id = ?
    `);

    const result = stmt.run(new Date().toISOString(), deliveredTo || 'Patient', reportId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    res.json({
      success: true,
      message: "Report delivered successfully"
    });
  } catch (error) {
    console.error("Error delivering report:", error.message);
    res.status(500).json({
      success: false,
      message: "Error delivering report",
      error: error.message
    });
  }
};

/**
 * Get lab test statistics
 * GET /api/lab/stats
 */
exports.getLabStats = (req, res) => {
  try {
    const totalTests = db.prepare("SELECT COUNT(*) as count FROM lab_tests").get().count;
    const pendingTests = db.prepare("SELECT COUNT(*) as count FROM lab_tests WHERE status = 'Pending'").get().count;
    const completedTests = db.prepare("SELECT COUNT(*) as count FROM lab_tests WHERE status = 'Completed'").get().count;
    const emergencyTests = db.prepare("SELECT COUNT(*) as count FROM lab_tests WHERE priority = 'Emergency'").get().count;

    const testsByType = db.prepare(`
      SELECT test_type, COUNT(*) as count FROM lab_tests GROUP BY test_type
    `).all();

    const testsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM lab_tests GROUP BY status
    `).all();

    res.json({
      success: true,
      stats: {
        totalTests,
        pendingTests,
        completedTests,
        emergencyTests,
        testsByType,
        testsByStatus
      }
    });
  } catch (error) {
    console.error("Error fetching lab stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching lab statistics",
      error: error.message
    });
  }
};

// ============================================
// EMERGENCY RESPONSE ENDPOINTS
// ============================================

/**
 * Create new emergency case
 * POST /api/emergency
 */
exports.createEmergencyCase = (req, res) => {
  try {
    const {
      patientId, patientName, patientPhone, patientAge, patientGender,
      emergencyType, severity, triageCategory, location, chiefComplaint,
      vitalSigns, initialAssessment, assignedDoctorId, assignedNurseId
    } = req.body;

    if (!patientName || !emergencyType || !severity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: patientName, emergencyType, severity"
      });
    }

    // Determine triage category if not provided
    let assignedTriage = triageCategory;
    if (!assignedTriage) {
      if (severity === 'Critical') assignedTriage = 'Resuscitation';
      else if (severity === 'High') assignedTriage = 'Emergency';
      else if (severity === 'Medium') assignedTriage = 'Urgent';
      else assignedTriage = 'Less Urgent';
    }

    const stmt = db.prepare(`
      INSERT INTO emergency_cases (
        patient_id, patient_name, patient_phone, patient_age, patient_gender,
        emergency_type, severity, triage_category, arrival_time, status,
        location, chief_complaint, vital_signs, initial_assessment,
        assigned_doctor_id, assigned_nurse_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patientId || null, patientName, patientPhone || null, patientAge || null,
      patientGender || null, emergencyType, severity, assignedTriage,
      new Date().toISOString(), location || null, chiefComplaint || null,
      vitalSigns ? JSON.stringify(vitalSigns) : null, initialAssessment || null,
      assignedDoctorId || null, assignedNurseId || null
    );

    const emergencyId = result.lastInsertRowid;

    // Create initial alert
    const alertStmt = db.prepare(`
      INSERT INTO emergency_alerts (emergency_id, alert_type, message, priority)
      VALUES (?, 'New Emergency', ?, ?)
    `);
    alertStmt.run(emergencyId, `New ${severity} emergency case: ${emergencyType}`, severity === 'Critical' ? 'Critical' : 'High');

    res.status(201).json({
      success: true,
      message: "Emergency case created successfully",
      emergencyId,
      triageCategory: assignedTriage
    });
  } catch (error) {
    console.error("Error creating emergency case:", error.message);
    res.status(500).json({
      success: false,
      message: "Error creating emergency case",
      error: error.message
    });
  }
};

/**
 * Get all emergency cases (with filters)
 * GET /api/emergency
 */
exports.getEmergencyCases = (req, res) => {
  try {
    const { status, severity, fromDate, toDate } = req.query;

    let query = `
      SELECT ec.*, d.name as assigned_doctor_name
      FROM emergency_cases ec
      LEFT JOIN doctors d ON ec.assigned_doctor_id = d.doctor_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += " AND ec.status = ?";
      params.push(status);
    }
    if (severity) {
      query += " AND ec.severity = ?";
      params.push(severity);
    }
    if (fromDate) {
      query += " AND ec.arrival_time >= ?";
      params.push(fromDate);
    }
    if (toDate) {
      query += " AND ec.arrival_time <= ?";
      params.push(toDate);
    }

    query += " ORDER BY ec.arrival_time DESC";

    const stmt = db.prepare(query);
    const cases = stmt.all(...params);

    res.json({
      success: true,
      cases: cases || []
    });
  } catch (error) {
    console.error("Error fetching emergency cases:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching emergency cases",
      error: error.message
    });
  }
};

/**
 * Get emergency case by ID
 * GET /api/emergency/:emergencyId
 */
exports.getEmergencyCaseById = (req, res) => {
  try {
    const { emergencyId } = req.params;

    const caseStmt = db.prepare(`
      SELECT ec.*, d.name as assigned_doctor_name, d.specialization
      FROM emergency_cases ec
      LEFT JOIN doctors d ON ec.assigned_doctor_id = d.doctor_id
      WHERE ec.emergency_id = ?
    `);
    const emergencyCase = caseStmt.get(emergencyId);

    if (!emergencyCase) {
      return res.status(404).json({
        success: false,
        message: "Emergency case not found"
      });
    }

    // Get alerts
    const alertsStmt = db.prepare("SELECT * FROM emergency_alerts WHERE emergency_id = ? ORDER BY created_at DESC");
    const alerts = alertsStmt.all(emergencyId);

    // Get team
    const teamStmt = db.prepare(`
      SELECT et.*, d.name as member_name, d.specialization
      FROM emergency_team et
      LEFT JOIN doctors d ON et.team_member_id = d.doctor_id
      WHERE et.emergency_id = ?
    `);
    const team = teamStmt.all(emergencyId);

    res.json({
      success: true,
      emergencyCase,
      alerts,
      team
    });
  } catch (error) {
    console.error("Error fetching emergency case:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching emergency case",
      error: error.message
    });
  }
};

/**
 * Update emergency case status
 * PUT /api/emergency/:emergencyId/status
 */
exports.updateEmergencyStatus = (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { status, treatmentGiven, outcome, notes } = req.body;

    const validStatuses = ['Active', 'In Treatment', 'Admitted', 'Discharged', 'Transferred', 'Deceased'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    let query = "UPDATE emergency_cases SET status = ?, updated_at = ?";
    const params = [status, new Date().toISOString()];

    if (treatmentGiven) {
      query += ", treatment_given = ?";
      params.push(treatmentGiven);
    }
    if (outcome) {
      query += ", outcome = ?";
      params.push(outcome);
    }
    if (notes) {
      query += ", notes = ?";
      params.push(notes);
    }

    query += " WHERE emergency_id = ?";
    params.push(emergencyId);

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Emergency case not found"
      });
    }

    // Create status update alert
    const alertStmt = db.prepare(`
      INSERT INTO emergency_alerts (emergency_id, alert_type, message, priority)
      VALUES (?, 'Status Update', ?, 'Medium')
    `);
    alertStmt.run(emergencyId, `Emergency status updated to: ${status}`);

    res.json({
      success: true,
      message: "Emergency status updated"
    });
  } catch (error) {
    console.error("Error updating emergency status:", error.message);
    res.status(500).json({
      success: false,
      message: "Error updating emergency status",
      error: error.message
    });
  }
};

/**
 * Assign doctor to emergency case
 * PUT /api/emergency/:emergencyId/assign-doctor
 */
exports.assignDoctorToEmergency = (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required"
      });
    }

    const stmt = db.prepare(`
      UPDATE emergency_cases SET assigned_doctor_id = ?, updated_at = ?
      WHERE emergency_id = ?
    `);
    const result = stmt.run(doctorId, new Date().toISOString(), emergencyId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Emergency case not found"
      });
    }

    // Get doctor name for alert
    const doctorStmt = db.prepare("SELECT name FROM doctors WHERE doctor_id = ?");
    const doctor = doctorStmt.get(doctorId);

    // Create assignment alert
    const alertStmt = db.prepare(`
      INSERT INTO emergency_alerts (emergency_id, alert_type, message, priority)
      VALUES (?, 'Doctor Assignment', ?, 'High')
    `);
    alertStmt.run(emergencyId, `Dr. ${doctor.name} assigned to emergency case`);

    res.json({
      success: true,
      message: "Doctor assigned successfully"
    });
  } catch (error) {
    console.error("Error assigning doctor:", error.message);
    res.status(500).json({
      success: false,
      message: "Error assigning doctor",
      error: error.message
    });
  }
};

/**
 * Get active emergencies (dashboard)
 * GET /api/emergency/active
 */
exports.getActiveEmergencies = (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT ec.*, d.name as assigned_doctor_name
      FROM emergency_cases ec
      LEFT JOIN doctors d ON ec.assigned_doctor_id = d.doctor_id
      WHERE ec.status IN ('Active', 'In Treatment')
      ORDER BY 
        CASE ec.severity 
          WHEN 'Critical' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Medium' THEN 3 
          ELSE 4 
        END,
        ec.arrival_time ASC
    `);
    const cases = stmt.all();

    res.json({
      success: true,
      cases
    });
  } catch (error) {
    console.error("Error fetching active emergencies:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching active emergencies",
      error: error.message
    });
  }
};

/**
 * Get emergency statistics
 * GET /api/emergency/stats
 */
exports.getEmergencyStats = (req, res) => {
  try {
    const totalCases = db.prepare("SELECT COUNT(*) as count FROM emergency_cases").get().count;
    const activeCases = db.prepare("SELECT COUNT(*) as count FROM emergency_cases WHERE status IN ('Active', 'In Treatment')").get().count;
    const criticalCases = db.prepare("SELECT COUNT(*) as count FROM emergency_cases WHERE severity = 'Critical' AND status IN ('Active', 'In Treatment')").get().count;

    const casesBySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count FROM emergency_cases GROUP BY severity
    `).all();

    const casesByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM emergency_cases GROUP BY status
    `).all();

    const casesByType = db.prepare(`
      SELECT emergency_type, COUNT(*) as count FROM emergency_cases GROUP BY emergency_type
    `).all();

    res.json({
      success: true,
      stats: {
        totalCases,
        activeCases,
        criticalCases,
        casesBySeverity,
        casesByStatus,
        casesByType
      }
    });
  } catch (error) {
    console.error("Error fetching emergency stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching emergency statistics",
      error: error.message
    });
  }
};

/**
 * Get emergency alerts
 * GET /api/emergency/alerts
 */
exports.getEmergencyAlerts = (req, res) => {
  try {
    const { unreadOnly } = req.query;

    let query = "SELECT * FROM emergency_alerts ORDER BY created_at DESC";
    if (unreadOnly === 'true') {
      query = "SELECT * FROM emergency_alerts WHERE is_read = 0 ORDER BY created_at DESC";
    }

    const stmt = db.prepare(query);
    const alerts = stmt.all();

    res.json({
      success: true,
      alerts: alerts || []
    });
  } catch (error) {
    console.error("Error fetching alerts:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching alerts",
      error: error.message
    });
  }
};

/**
 * Mark alert as read
 * PUT /api/emergency/alerts/:alertId/read
 */
exports.markAlertAsRead = (req, res) => {
  try {
    const { alertId } = req.params;

    const stmt = db.prepare("UPDATE emergency_alerts SET is_read = 1 WHERE alert_id = ?");
    const result = stmt.run(alertId);

    res.json({
      success: true,
      message: "Alert marked as read"
    });
  } catch (error) {
    console.error("Error marking alert as read:", error.message);
    res.status(500).json({
      success: false,
      message: "Error marking alert as read",
      error: error.message
    });
  }
};