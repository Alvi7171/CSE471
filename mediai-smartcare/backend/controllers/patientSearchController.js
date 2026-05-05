/**
 * Advanced Patient Search & Management Controller
 * Module 1: Patient Management & Medical Timeline (Secondary Responsibility)
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */

const { db } = require("../config/database");
const crypto = require("crypto");

// ============================================
// ADVANCED SEARCH FUNCTIONS
// ============================================

/**
 * Comprehensive patient search with multiple criteria
 */
exports.searchPatients = (req, res) => {
  try {
    const {
      query,
      patientId,
      phone,
      email,
      name,
      dateOfBirth,
      gender,
      bloodType,
      city,
      department,
      registrationDateFrom,
      registrationDateTo,
      lastVisitFrom,
      lastVisitTo,
      hasChronicDiseases,
      sortBy = 'last_updated',
      sortOrder = 'DESC',
      page = 1,
      limit = 20
    } = req.query;

    let whereConditions = [];
    let params = [];

    // Build dynamic WHERE clause
    if (query) {
      whereConditions.push(`
        (patients.first_name LIKE ? OR 
         patients.last_name LIKE ? OR 
         patients.smart_patient_id LIKE ? OR 
         patients.phone_number LIKE ? OR 
         patients.email LIKE ?)
      `);
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (patientId) {
      whereConditions.push("(patients.patient_id = ? OR patients.smart_patient_id = ?)");
      params.push(patientId, patientId);
    }

    if (phone) {
      whereConditions.push("phone_number LIKE ?");
      params.push(`%${phone}%`);
    }

    if (email) {
      whereConditions.push("email LIKE ?");
      params.push(`%${email}%`);
    }

    if (name) {
      whereConditions.push("(first_name LIKE ? OR last_name LIKE ?)");
      params.push(`%${name}%`, `%${name}%`);
    }

    if (dateOfBirth) {
      whereConditions.push("date_of_birth = ?");
      params.push(dateOfBirth);
    }

    if (gender) {
      whereConditions.push("gender = ?");
      params.push(gender);
    }

    if (bloodType) {
      whereConditions.push("blood_type = ?");
      params.push(bloodType);
    }

    if (city) {
      whereConditions.push("city LIKE ?");
      params.push(`%${city}%`);
    }

    if (registrationDateFrom) {
      whereConditions.push("registration_date >= ?");
      params.push(registrationDateFrom);
    }

    if (registrationDateTo) {
      whereConditions.push("registration_date <= ?");
      params.push(registrationDateTo);
    }

    // Always join with medical_visits to get last visit info
    let joinClause = `
      LEFT JOIN (
        SELECT 
          patient_id,
          MAX(visit_date) as last_visit_date,
          COUNT(*) as total_visits
        FROM medical_visits 
        GROUP BY patient_id
      ) latest_visits ON patients.patient_id = latest_visits.patient_id
    `;
    
    if (lastVisitFrom) {
      whereConditions.push("latest_visits.last_visit_date >= ?");
      params.push(lastVisitFrom);
    }
    
    if (lastVisitTo) {
      whereConditions.push("latest_visits.last_visit_date <= ?");
      params.push(lastVisitTo);
    }

    if (hasChronicDiseases === 'true') {
      whereConditions.push("(chronic_diseases IS NOT NULL AND chronic_diseases != '')");
    } else if (hasChronicDiseases === 'false') {
      whereConditions.push("(chronic_diseases IS NULL OR chronic_diseases = '')");
    }

    // Validate sort field
    const validSortFields = ['first_name', 'last_name', 'registration_date', 'last_updated', 'last_visit_date', 'total_visits'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'last_updated';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total results
    const countQuery = `
      SELECT COUNT(*) as total
      FROM patients 
      ${joinClause}
      ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
    `;
    
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult.total;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Main search query
    const searchQuery = `
      SELECT 
        patients.patient_id,
        patients.smart_patient_id,
        patients.first_name,
        patients.last_name,
        patients.date_of_birth,
        patients.gender,
        patients.blood_type,
        patients.phone_number,
        patients.email,
        patients.address,
        patients.city,
        patients.state_province,
        patients.postal_code,
        patients.country,
        patients.emergency_contact_name,
        patients.emergency_contact_phone,
        patients.national_id,
        patients.allergies,
        patients.chronic_diseases,
        patients.current_medications,
        patients.registration_date,
        patients.last_updated,
        COALESCE(latest_visits.last_visit_date, 'Never') as last_visit_date,
        COALESCE(latest_visits.total_visits, 0) as total_visits
      FROM patients 
      ${joinClause}
      ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
      ORDER BY ${['last_visit_date', 'total_visits'].includes(sortField) ? sortField : `patients.${sortField}`} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    const patients = db.prepare(searchQuery).all(...params, parseInt(limit), parseInt(offset || 0));

    res.json({
      success: true,
      data: patients,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalResults: total,
        resultsPerPage: parseInt(limit),
        hasNextPage: offset + patients.length < total,
        hasPreviousPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error in patient search:", error);
    res.status(500).json({
      success: false,
      message: "Error searching patients",
      error: error.message
    });
  }
};

/**
 * Get patient statistics and analytics
 */
exports.getPatientStatistics = (req, res) => {
  try {
    const { dateFrom, dateTo, department } = req.query;

    let dateFilter = "";
    let params = [];
    
    if (dateFrom) {
      dateFilter += " AND registration_date >= ?";
      params.push(dateFrom);
    }
    
    if (dateTo) {
      dateFilter += " AND registration_date <= ?";
      params.push(dateTo);
    }

    // Basic statistics
    const totalPatients = db.prepare(`
      SELECT COUNT(*) as count FROM patients WHERE 1=1 ${dateFilter}
    `).get(...params);

    const genderDistribution = db.prepare(`
      SELECT gender, COUNT(*) as count 
      FROM patients 
      WHERE 1=1 ${dateFilter}
      GROUP BY gender
    `).all(...params);

    const ageGroups = db.prepare(`
      SELECT 
        CASE 
          WHEN CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', date_of_birth) AS INTEGER) < 18 THEN 'Under 18'
          WHEN CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', date_of_birth) AS INTEGER) BETWEEN 18 AND 35 THEN '18-35'
          WHEN CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', date_of_birth) AS INTEGER) BETWEEN 36 AND 50 THEN '36-50'
          WHEN CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', date_of_birth) AS INTEGER) BETWEEN 51 AND 65 THEN '51-65'
          ELSE 'Over 65'
        END as age_group,
        COUNT(*) as count
      FROM patients 
      WHERE 1=1 ${dateFilter}
      GROUP BY age_group
    `).all(...params);

    const bloodTypeDistribution = db.prepare(`
      SELECT blood_type, COUNT(*) as count 
      FROM patients 
      WHERE blood_type IS NOT NULL ${dateFilter}
      GROUP BY blood_type
    `).all(...params);

    const chronicDiseasesCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM patients 
      WHERE chronic_diseases IS NOT NULL AND chronic_diseases != '' ${dateFilter}
    `).get(...params);

    const newRegistrations = db.prepare(`
      SELECT 
        DATE(registration_date) as date,
        COUNT(*) as count
      FROM patients 
      WHERE registration_date >= date('now', '-30 days')
      GROUP BY DATE(registration_date)
      ORDER BY date DESC
    `).all();

    res.json({
      success: true,
      data: {
        totalPatients: totalPatients.count,
        genderDistribution,
        ageGroups,
        bloodTypeDistribution,
        chronicDiseasesCount: chronicDiseasesCount.count,
        newRegistrations,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error getting patient statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving patient statistics",
      error: error.message
    });
  }
};

/**
 * Get recently active patients (with visits in last X days)
 */
exports.getRecentlyActivePatients = (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;

    const patients = db.prepare(`
      SELECT DISTINCT
        p.patient_id,
        p.smart_patient_id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.email,
        MAX(mv.visit_date) as last_visit_date,
        COUNT(mv.visit_id) as visits_count
      FROM patients p
      INNER JOIN medical_visits mv ON p.patient_id = mv.patient_id
      WHERE mv.visit_date >= date('now', '-${days} days')
      GROUP BY p.patient_id
      ORDER BY last_visit_date DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({
      success: true,
      data: patients,
      criteria: { days: parseInt(days), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error("Error getting recently active patients:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving recently active patients",
      error: error.message
    });
  }
};

/**
 * Export patient data (CSV/Excel format)
 */
exports.exportPatients = (req, res) => {
  try {
    const { format = 'csv', searchCriteria } = req.body;

    // Build search query based on criteria
    let whereClause = "WHERE 1=1";
    let params = [];

    if (searchCriteria) {
      // Parse search criteria similar to searchPatients function
      Object.entries(searchCriteria).forEach(([key, value]) => {
        if (value && value !== '') {
          switch (key) {
            case 'name':
              whereClause += " AND (first_name LIKE ? OR last_name LIKE ?)";
              params.push(`%${value}%`, `%${value}%`);
              break;
            case 'phone':
              whereClause += " AND phone_number LIKE ?";
              params.push(`%${value}%`);
              break;
            case 'email':
              whereClause += " AND email LIKE ?";
              params.push(`%${value}%`);
              break;
            case 'city':
              whereClause += " AND city LIKE ?";
              params.push(`%${value}%`);
              break;
            case 'gender':
              whereClause += " AND gender = ?";
              params.push(value);
              break;
          }
        }
      });
    }

    const patients = db.prepare(`
      SELECT 
        smart_patient_id as "Smart Patient ID",
        first_name as "First Name",
        last_name as "Last Name",
        date_of_birth as "Date of Birth",
        gender as "Gender",
        blood_type as "Blood Type",
        phone_number as "Phone Number",
        email as "Email",
        address as "Address",
        city as "City",
        state_province as "State/Province",
        postal_code as "Postal Code",
        country as "Country",
        emergency_contact_name as "Emergency Contact",
        emergency_contact_phone as "Emergency Phone",
        allergies as "Allergies",
        chronic_diseases as "Chronic Diseases",
        current_medications as "Current Medications",
        registration_date as "Registration Date"
      FROM patients 
      ${whereClause}
      ORDER BY registration_date DESC
    `).all(...params);

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(patients[0] || {});
      const csvRows = [
        headers.join(','),
        ...patients.map(patient => 
          headers.map(header => `"${patient[header] || ''}"`).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="patients_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvRows);
    } else {
      // Return JSON for Excel processing
      res.json({
        success: true,
        data: patients,
        exportedAt: new Date().toISOString(),
        totalRecords: patients.length
      });
    }
  } catch (error) {
    console.error("Error exporting patients:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting patient data",
      error: error.message
    });
  }
};

/**
 * Get patient dashboard summary
 */
exports.getPatientDashboard = (req, res) => {
  try {
    const { patientId } = req.params;

    // Patient basic info
    const patient = db.prepare(`
      SELECT * FROM patients WHERE patient_id = ? OR smart_patient_id = ?
    `).get(patientId, patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Recent visits (last 6 months)
    const recentVisits = db.prepare(`
      SELECT 
        mv.visit_id,
        mv.visit_date,
        mv.visit_reason,
        mv.diagnosis,
        mv.status,
        d.name as doctor_name,
        d.specialization
      FROM medical_visits mv
      LEFT JOIN doctors d ON mv.doctor_id = d.doctor_id
      WHERE mv.patient_id = ? AND mv.visit_date >= date('now', '-6 months')
      ORDER BY mv.visit_date DESC
      LIMIT 5
    `).all(patient.patient_id);

    // Active prescriptions
    const activePrescriptions = db.prepare(`
      SELECT 
        p.prescription_id,
        p.medication_name,
        p.dosage,
        p.frequency,
        p.prescription_date,
        d.name as doctor_name
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.patient_id = ? AND p.is_active = 1
      ORDER BY p.prescription_date DESC
    `).all(patient.patient_id);

    // Recent diagnostic reports
    const recentReports = db.prepare(`
      SELECT 
        dr.report_id,
        dr.test_name,
        dr.report_type,
        dr.report_date,
        dr.urgency_level,
        d.name as doctor_name
      FROM diagnostic_reports dr
      LEFT JOIN doctors d ON dr.doctor_id = d.doctor_id
      WHERE dr.patient_id = ? AND dr.report_date >= date('now', '-3 months')
      ORDER BY dr.report_date DESC
      LIMIT 5
    `).all(patient.patient_id);

    // Visit statistics
    const visitStats = db.prepare(`
      SELECT 
        COUNT(*) as total_visits,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_visits,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_visits,
        MAX(visit_date) as last_visit_date
      FROM medical_visits 
      WHERE patient_id = ?
    `).get(patient.patient_id);

    // Upcoming appointments
    const upcomingAppointments = db.prepare(`
      SELECT 
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        d.name as doctor_name,
        d.specialization
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.patient_user_id = ? AND a.appointment_date >= date('now')
      ORDER BY a.appointment_date ASC
      LIMIT 3
    `).all(patient.patient_id);

    res.json({
      success: true,
      data: {
        patient,
        recentVisits,
        activePrescriptions,
        recentReports,
        visitStats,
        upcomingAppointments,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error getting patient dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving patient dashboard",
      error: error.message
    });
  }
};
