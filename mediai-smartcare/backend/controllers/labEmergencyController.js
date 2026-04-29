const { query, engine } = require("../config/database");

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Initialize lab and emergency tables
 */
const initializeLabEmergencyTables = async () => {
  try {
    const isSqlite = engine === "sqlite";
    const autoInc = isSqlite ? "AUTOINCREMENT" : "AUTO_INCREMENT";
    const pkType = isSqlite ? "INTEGER" : "INT";

    // Laboratory Tests Table
    await query(`
      CREATE TABLE IF NOT EXISTS lab_tests (
        test_id ${pkType} PRIMARY KEY ${autoInc},
        patient_id INT NOT NULL,
        patient_name VARCHAR(255),
        doctor_id INT NOT NULL,
        appointment_id INT,
        test_type VARCHAR(100) NOT NULL,
        test_name VARCHAR(255) NOT NULL,
        priority VARCHAR(50) DEFAULT 'Normal',
        status VARCHAR(50) DEFAULT 'Pending',
        request_date DATETIME NOT NULL,
        scheduled_date DATETIME,
        collected_date DATETIME,
        completed_date DATETIME,
        lab_name VARCHAR(255),
        cost DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add patient_name column if it doesn't exist (migration)
    try {
      await query("ALTER TABLE lab_tests ADD COLUMN patient_name VARCHAR(255)");
    } catch (e) {
      // Column might already exist
    }

    // Lab Test Results Table
    await query(`
      CREATE TABLE IF NOT EXISTS lab_results (
        result_id ${pkType} PRIMARY KEY ${autoInc},
        test_id INT NOT NULL,
        parameter_name VARCHAR(255) NOT NULL,
        value VARCHAR(255) NOT NULL,
        unit VARCHAR(50),
        reference_range VARCHAR(255),
        is_abnormal TINYINT(1) DEFAULT 0,
        abnormality_level VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Lab Reports Table
    await query(`
      CREATE TABLE IF NOT EXISTS lab_reports (
        report_id ${pkType} PRIMARY KEY ${autoInc},
        test_id INT NOT NULL,
        report_type VARCHAR(255) NOT NULL,
        report_date DATETIME NOT NULL,
        lab_technician VARCHAR(255),
        reviewed_by INT,
        reviewed_date DATETIME,
        file_path VARCHAR(255),
        summary TEXT,
        interpretation TEXT,
        is_delivered TINYINT(1) DEFAULT 0,
        delivered_date DATETIME,
        delivered_to VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Emergency Cases Table
    await query(`
      CREATE TABLE IF NOT EXISTS emergency_cases (
        emergency_id ${pkType} PRIMARY KEY ${autoInc},
        patient_id INT,
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(50),
        patient_age INT,
        patient_gender VARCHAR(20),
        emergency_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        triage_category VARCHAR(100),
        arrival_time DATETIME NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        location TEXT,
        chief_complaint TEXT,
        vital_signs TEXT,
        initial_assessment TEXT,
        assigned_doctor_id INT,
        assigned_nurse_id INT,
        treatment_given TEXT,
        outcome TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Emergency Alerts Table
    await query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        alert_id ${pkType} PRIMARY KEY ${autoInc},
        emergency_id INT NOT NULL,
        alert_type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'High',
        is_read TINYINT(1) DEFAULT 0,
        sent_to VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Emergency Response Team Table
    await query(`
      CREATE TABLE IF NOT EXISTS emergency_team (
        team_id ${pkType} PRIMARY KEY ${autoInc},
        emergency_id INT NOT NULL,
        team_member_id INT NOT NULL,
        member_role VARCHAR(100) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Active'
      )
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
exports.createLabTest = async (req, res) => {
  try {
    const {
      patientId, patientName, doctorId, appointmentId, testType, testName,
      priority, scheduledDate, labName, cost, notes
    } = req.body;

    console.log("Creating lab test request:", req.body);

    if (!patientName || !testType || !testName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: patientName, testType, testName"
      });
    }

    const requestDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const params = [
      patientId || 0, patientName, doctorId || 1, appointmentId || null, 
      testType, testName, priority || 'Normal', requestDate, scheduledDate || null,
      labName || null, cost || null, notes || null
    ];

    console.log("Query params:", params);

    const result = await query(`
      INSERT INTO lab_tests (
        patient_id, patient_name, doctor_id, appointment_id, test_type, test_name,
        priority, status, request_date, scheduled_date, lab_name, cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?)
    `, params);

    res.status(201).json({
      success: true,
      message: "Lab test request created successfully",
      testId: result.insertId
    });
  } catch (error) {
    console.error("Error creating lab test:", error);
    res.status(500).json({
      success: false,
      message: "Error creating lab test request",
      error: error.message,
      details: error.toString()
    });
  }
};

/**
 * Get all lab tests (with filters)
 * GET /api/lab/tests
 */
exports.getLabTests = async (req, res) => {
  try {
    const { patientId, status, priority, fromDate, toDate } = req.query;

    const isSqlite = engine === "sqlite";
    const displayNameSql = isSqlite 
      ? "COALESCE(p.first_name || ' ' || p.last_name, lt.patient_name)" 
      : "COALESCE(CONCAT(p.first_name, ' ', p.last_name), lt.patient_name)";

    let sql = `
      SELECT lt.*, ${displayNameSql} as display_name,
             p.phone_number, d.name as doctor_name, d.specialization
      FROM lab_tests lt
      LEFT JOIN patients p ON lt.patient_id = p.patient_id
      LEFT JOIN doctors d ON lt.doctor_id = d.doctor_id
      WHERE 1=1
    `;
    const params = [];

    if (patientId) {
      sql += " AND lt.patient_id = ?";
      params.push(patientId);
    }
    if (status) {
      sql += " AND lt.status = ?";
      params.push(status);
    }
    if (priority) {
      sql += " AND lt.priority = ?";
      params.push(priority);
    }
    if (fromDate) {
      sql += " AND lt.request_date >= ?";
      params.push(fromDate);
    }
    if (toDate) {
      sql += " AND lt.request_date <= ?";
      params.push(toDate);
    }

    sql += " ORDER BY lt.request_date DESC";

    const tests = await query(sql, params);

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
exports.getLabTestById = async (req, res) => {
  try {
    const { testId } = req.params;

    const isSqlite = engine === "sqlite";
    const displayNameSql = isSqlite 
      ? "COALESCE(p.first_name || ' ' || p.last_name, lt.patient_name)" 
      : "COALESCE(CONCAT(p.first_name, ' ', p.last_name), lt.patient_name)";

    const testRows = await query(`
      SELECT lt.*, ${displayNameSql} as display_name,
             p.first_name, p.last_name, p.phone_number, p.date_of_birth, p.gender,
             d.name as doctor_name, d.specialization
      FROM lab_tests lt
      LEFT JOIN patients p ON lt.patient_id = p.patient_id
      LEFT JOIN doctors d ON lt.doctor_id = d.doctor_id
      WHERE lt.test_id = ?
    `, [testId]);

    const test = testRows[0];

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found"
      });
    }

    // Get results
    const results = await query("SELECT * FROM lab_results WHERE test_id = ?", [testId]);

    // Get report
    const reportRows = await query("SELECT * FROM lab_reports WHERE test_id = ? ORDER BY report_date DESC LIMIT 1", [testId]);
    const report = reportRows[0];

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
exports.updateLabTestStatus = async (req, res) => {
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

    let sql = "UPDATE lab_tests SET status = ?";
    const params = [status];

    if (status === 'Sample Collected' && collectedDate) {
      sql += ", collected_date = ?";
      params.push(collectedDate);
    }
    if (status === 'Completed' && completedDate) {
      sql += ", completed_date = ?";
      params.push(completedDate);
    }

    sql += " WHERE test_id = ?";
    params.push(testId);

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
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
exports.addLabResults = async (req, res) => {
  try {
    const { testId } = req.params;
    const { results } = req.body; // Array of { parameterName, value, unit, referenceRange, isAbnormal, abnormalityLevel, notes }

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: "Results array is required"
      });
    }

    for (const r of results) {
      await query(`
        INSERT INTO lab_results (test_id, parameter_name, value, unit, reference_range, is_abnormal, abnormality_level, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testId, r.parameterName, r.value, r.unit || null,
        r.referenceRange || null, r.isAbnormal ? 1 : 0,
        r.abnormalityLevel || null, r.notes || null
      ]);
    }

    // Update test status to In Progress if not already
    await query("UPDATE lab_tests SET status = 'In Progress' WHERE test_id = ? AND status = 'Sample Collected'", [testId]);

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
exports.generateLabReport = async (req, res) => {
  try {
    const { testId } = req.params;
    const { reportType, labTechnician, reviewedBy, summary, interpretation } = req.body;

    // Get test details
    const testRows = await query("SELECT * FROM lab_tests WHERE test_id = ?", [testId]);
    const test = testRows[0];

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Lab test not found"
      });
    }

    // Get results
    const results = await query("SELECT * FROM lab_results WHERE test_id = ?", [testId]);

    // Check for critical abnormalities
    const criticalResults = results.filter(r => r.abnormality_level === 'Critical');
    const hasCritical = criticalResults.length > 0;

    const result = await query(`
      INSERT INTO lab_reports (
        test_id, report_type, report_date, lab_technician, reviewed_by,
        summary, interpretation, is_delivered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      testId,
      reportType || 'Complete Blood Count',
      new Date().toISOString(),
      labTechnician || null,
      reviewedBy || null,
      summary || `Test completed with ${results.length} parameters analyzed.${hasCritical ? ' CRITICAL VALUES DETECTED - Immediate doctor review required.' : ''}`,
      interpretation || null
    ]);

    // Update test status to Completed
    await query("UPDATE lab_tests SET status = 'Completed', completed_date = ? WHERE test_id = ?", [new Date().toISOString(), testId]);

    res.status(201).json({
      success: true,
      message: "Lab report generated successfully",
      reportId: result.insertId,
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
exports.deliverLabReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { deliveredTo } = req.body;

    const result = await query(`
      UPDATE lab_reports SET is_delivered = 1, delivered_date = ?, delivered_to = ?
      WHERE report_id = ?
    `, [new Date().toISOString(), deliveredTo || 'Patient', reportId]);

    if (result.affectedRows === 0) {
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
exports.getLabStats = async (req, res) => {
  try {
    const totalResult = await query("SELECT COUNT(*) as count FROM lab_tests");
    const pendingResult = await query("SELECT COUNT(*) as count FROM lab_tests WHERE status = 'Pending'");
    const completedResult = await query("SELECT COUNT(*) as count FROM lab_tests WHERE status = 'Completed'");
    const emergencyResult = await query("SELECT COUNT(*) as count FROM lab_tests WHERE priority = 'Emergency'");

    const testsByType = await query(`
      SELECT test_type, COUNT(*) as count FROM lab_tests GROUP BY test_type
    `);

    const testsByStatus = await query(`
      SELECT status, COUNT(*) as count FROM lab_tests GROUP BY status
    `);

    res.json({
      success: true,
      stats: {
        totalTests: totalResult[0].count,
        pendingTests: pendingResult[0].count,
        completedTests: completedResult[0].count,
        emergencyTests: emergencyResult[0].count,
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
exports.createEmergencyCase = async (req, res) => {
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

    const result = await query(`
      INSERT INTO emergency_cases (
        patient_id, patient_name, patient_phone, patient_age, patient_gender,
        emergency_type, severity, triage_category, arrival_time, status,
        location, chief_complaint, vital_signs, initial_assessment,
        assigned_doctor_id, assigned_nurse_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patientId || null, patientName, patientPhone || null, patientAge || null,
      patientGender || null, emergencyType, severity, assignedTriage,
      new Date().toISOString(), req.body.status || 'Active', location || null, chiefComplaint || null,
      vitalSigns ? JSON.stringify(vitalSigns) : null, initialAssessment || null,
      assignedDoctorId || null, assignedNurseId || null
    ]);

    const emergencyId = result.insertId;

    // Create initial alert
    await query(`
      INSERT INTO emergency_alerts (emergency_id, alert_type, message, priority)
      VALUES (?, 'New Emergency', ?, ?)
    `, [emergencyId, `New ${severity} emergency case: ${emergencyType}`, severity === 'Critical' ? 'Critical' : 'High']);

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
exports.getEmergencyCases = async (req, res) => {
  try {
    const { status, severity, fromDate, toDate } = req.query;

    let sql = `
      SELECT ec.*, d.name as assigned_doctor_name
      FROM emergency_cases ec
      LEFT JOIN doctors d ON ec.assigned_doctor_id = d.doctor_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += " AND ec.status = ?";
      params.push(status);
    }
    if (severity) {
      sql += " AND ec.severity = ?";
      params.push(severity);
    }
    if (fromDate) {
      sql += " AND ec.arrival_time >= ?";
      params.push(fromDate);
    }
    if (toDate) {
      sql += " AND ec.arrival_time <= ?";
      params.push(toDate);
    }

    sql += " ORDER BY ec.arrival_time DESC";

    const cases = await query(sql, params);

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
exports.getEmergencyCaseById = async (req, res) => {
  try {
    const { emergencyId } = req.params;

    const caseRows = await query(`
      SELECT ec.*, d.name as assigned_doctor_name, d.specialization
      FROM emergency_cases ec
      LEFT JOIN doctors d ON ec.assigned_doctor_id = d.doctor_id
      WHERE ec.emergency_id = ?
    `, [emergencyId]);

    const emergencyCase = caseRows[0];

    if (!emergencyCase) {
      return res.status(404).json({
        success: false,
        message: "Emergency case not found"
      });
    }

    // Get alerts
    const alerts = await query("SELECT * FROM emergency_alerts WHERE emergency_id = ? ORDER BY created_at DESC", [emergencyId]);

    // Get team
    const team = await query(`
      SELECT et.*, d.name as member_name, d.specialization
      FROM emergency_team et
      LEFT JOIN doctors d ON et.team_member_id = d.doctor_id
      WHERE et.emergency_id = ?
    `, [emergencyId]);

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
exports.updateEmergencyStatus = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { status, treatmentGiven, outcome, notes } = req.body;

    const validStatuses = ['Reported', 'Active', 'In Treatment', 'Admitted', 'Discharged', 'Transferred', 'Deceased'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    let sql = "UPDATE emergency_cases SET status = ?, updated_at = ?";
    const params = [status, new Date().toISOString()];

    if (treatmentGiven) {
      sql += ", treatment_given = ?";
      params.push(treatmentGiven);
    }
    if (outcome) {
      sql += ", outcome = ?";
      params.push(outcome);
    }
    if (notes) {
      sql += ", notes = ?";
      params.push(notes);
    }

    sql += " WHERE emergency_id = ?";
    params.push(emergencyId);

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Emergency case not found"
      });
    }

    // Create status update alert
    await query(`
      INSERT INTO emergency_alerts (emergency_id, alert_type, message, priority)
      VALUES (?, 'Status Update', ?, 'Medium')
    `, [emergencyId, `Emergency status updated to: ${status}`]);

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
exports.assignDoctorToEmergency = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required"
      });
    }

    await query("UPDATE emergency_cases SET assigned_doctor_id = ? WHERE emergency_id = ?", [doctorId, emergencyId]);

    // Add to team if not already
    const teamExists = await query("SELECT * FROM emergency_team WHERE emergency_id = ? AND team_member_id = ?", [emergencyId, doctorId]);

    if (teamExists.length === 0) {
      await query(`
        INSERT INTO emergency_team (emergency_id, team_member_id, member_role)
        VALUES (?, ?, 'Lead Doctor')
      `, [emergencyId, doctorId]);
    }

    // Create alert
    await query(`
      INSERT INTO emergency_alerts (emergency_id, alert_type, message, priority)
      VALUES (?, 'Doctor Assignment', 'Doctor has been assigned to the case', 'Medium')
    `, [emergencyId]);

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
 * Get active alerts (emergency)
 */
exports.getActiveAlerts = async (req, res) => {
  try {
    const alerts = await query(`
      SELECT ea.*, ec.emergency_type, ec.patient_name
      FROM emergency_alerts ea
      JOIN emergency_cases ec ON ea.emergency_id = ec.emergency_id
      WHERE ea.is_read = 0
      ORDER BY ea.created_at DESC
    `);

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
 * Get emergency statistics
 */
exports.getEmergencyStats = async (req, res) => {
  try {
    const total = await query("SELECT COUNT(*) as count FROM emergency_cases");
    const active = await query("SELECT COUNT(*) as count FROM emergency_cases WHERE status = 'Active'");
    const critical = await query("SELECT COUNT(*) as count FROM emergency_cases WHERE severity = 'Critical'");
    const completed = await query("SELECT COUNT(*) as count FROM emergency_cases WHERE status = 'Discharged'");

    res.json({
      success: true,
      stats: {
        totalCases: total[0].count,
        activeCases: active[0].count,
        criticalCases: critical[0].count,
        completedCases: completed[0].count
      }
    });
  } catch (error) {
    console.error("Error fetching emergency stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching emergency statistics"
    });
  }
};

/**
 * Get active emergencies
 */
exports.getActiveEmergencies = async (req, res) => {
  try {
    const cases = await query(`
      SELECT * FROM emergency_cases 
      WHERE status IN ('Active', 'In Treatment', 'Reported') 
      ORDER BY arrival_time DESC
    `);
    res.json({ success: true, cases });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching active emergencies" });
  }
};

/**
 * Get all emergency alerts
 */
exports.getEmergencyAlerts = async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    let sql = "SELECT * FROM emergency_alerts";
    if (unreadOnly === 'true') sql += " WHERE is_read = 0";
    sql += " ORDER BY created_at DESC";
    
    const alerts = await query(sql);
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching alerts" });
  }
};

/**
 * Get patient emergencies
 */
exports.getPatientEmergencies = async (req, res) => {
  try {
    const { patientPhone } = req.params;
    const cases = await query("SELECT * FROM emergency_cases WHERE patient_phone = ? ORDER BY arrival_time DESC", [patientPhone]);
    res.json({ success: true, cases });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching patient emergencies" });
  }
};

/**
 * Mark alert as read
 */
exports.markAlertAsRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    await query("UPDATE emergency_alerts SET is_read = 1 WHERE alert_id = ?", [alertId]);
    res.json({ success: true, message: "Alert marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating alert" });
  }
};