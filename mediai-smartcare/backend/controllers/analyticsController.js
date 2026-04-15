/**
 * Hospital Analytics Reports Controller
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 * Purpose: Generate admin dashboards with analytics on patient visits,
 *          department performance, doctor workload, and revenue statistics
 */

const { db } = require("../config/database");

/**
 * Get total patient visits with optional date range filtering
 * @param {string} startDate - ISO format date (YYYY-MM-DD)
 * @param {string} endDate - ISO format date (YYYY-MM-DD)
 */
const getTotalPatientVisits = (startDate, endDate) => {
  try {
    let query = "SELECT COUNT(*) as total_visits FROM medical_visits WHERE status = 'completed'";
    const params = [];

    if (startDate && endDate) {
      query += " AND DATE(visit_date) >= ? AND DATE(visit_date) <= ?";
      params.push(startDate, endDate);
    }

    const result = db.prepare(query).get(...params);
    
    // Get visits by day for trend analysis
    let trendQuery = "SELECT DATE(visit_date) as visit_day, COUNT(*) as visits FROM medical_visits WHERE status = 'completed'";
    const trendParams = [];
    
    if (startDate && endDate) {
      trendQuery += " AND DATE(visit_date) >= ? AND DATE(visit_date) <= ?";
      trendParams.push(startDate, endDate);
    }
    
    trendQuery += " GROUP BY DATE(visit_date) ORDER BY visit_day";
    const trendData = db.prepare(trendQuery).all(...trendParams);

    return {
      totalVisits: result.total_visits || 0,
      trend: trendData || [],
    };
  } catch (error) {
    console.error("Error getting total patient visits:", error);
    throw error;
  }
};

/**
 * Get department performance metrics
 * Shows: active doctors per department, total visits, average consultation fee
 */
const getDepartmentPerformance = (startDate, endDate) => {
  try {
    let query = `
      SELECT 
        d.department,
        COUNT(DISTINCT d.doctor_id) as total_doctors,
        COUNT(DISTINCT mv.visit_id) as total_visits,
        ROUND(AVG(d.consultation_fee), 2) as avg_consultation_fee,
        ROUND(SUM(d.consultation_fee), 2) as department_revenue,
        COUNT(CASE WHEN d.is_available = 1 THEN 1 END) as available_doctors
      FROM doctors d
      LEFT JOIN medical_visits mv ON d.doctor_id = mv.doctor_id AND mv.status = 'completed'
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += " AND DATE(mv.visit_date) >= ? AND DATE(mv.visit_date) <= ?";
      params.push(startDate, endDate);
    }

    query += " GROUP BY d.department ORDER BY total_visits DESC";
    
    const result = db.prepare(query).all(...params);
    return result || [];
  } catch (error) {
    console.error("Error getting department performance:", error);
    throw error;
  }
};

/**
 * Get doctor workload metrics
 * Shows: number of visits per doctor, patient load, average consultation fee
 */
const getDoctorWorkload = (startDate, endDate) => {
  try {
    let query = `
      SELECT 
        d.doctor_id,
        d.name,
        d.department,
        d.specialization,
        COUNT(DISTINCT mv.visit_id) as total_visits,
        COUNT(DISTINCT mv.patient_id) as unique_patients,
        ROUND(AVG(d.consultation_fee), 2) as avg_fee,
        ROUND(d.consultation_fee * COUNT(DISTINCT mv.visit_id), 2) as doctor_revenue,
        d.is_available,
        d.experience_years
      FROM doctors d
      LEFT JOIN medical_visits mv ON d.doctor_id = mv.doctor_id AND mv.status = 'completed'
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += " AND DATE(mv.visit_date) >= ? AND DATE(mv.visit_date) <= ?";
      params.push(startDate, endDate);
    }

    query += " GROUP BY d.doctor_id, d.name ORDER BY total_visits DESC";
    
    const result = db.prepare(query).all(...params);
    return result || [];
  } catch (error) {
    console.error("Error getting doctor workload:", error);
    throw error;
  }
};

/**
 * Get revenue statistics
 * Shows: total revenue, revenue by department, revenue trends
 */
const getRevenueStatistics = (startDate, endDate) => {
  try {
    // Total revenue
    let totalQuery = `
      SELECT 
        ROUND(SUM(d.consultation_fee), 2) as total_revenue,
        COUNT(DISTINCT mv.visit_id) as paid_visits
      FROM medical_visits mv
      JOIN doctors d ON mv.doctor_id = d.doctor_id
      WHERE mv.status = 'completed'
    `;
    
    const totalParams = [];
    
    if (startDate && endDate) {
      totalQuery += " AND DATE(mv.visit_date) >= ? AND DATE(mv.visit_date) <= ?";
      totalParams.push(startDate, endDate);
    }

    const totalRevenue = db.prepare(totalQuery).get(...totalParams);

    // Revenue by department
    let deptQuery = `
      SELECT 
        d.department,
        ROUND(SUM(d.consultation_fee), 2) as department_revenue,
        COUNT(DISTINCT mv.visit_id) as visit_count
      FROM medical_visits mv
      JOIN doctors d ON mv.doctor_id = d.doctor_id
      WHERE mv.status = 'completed'
    `;
    
    const deptParams = [];
    
    if (startDate && endDate) {
      deptQuery += " AND DATE(mv.visit_date) >= ? AND DATE(mv.visit_date) <= ?";
      deptParams.push(startDate, endDate);
    }

    deptQuery += " GROUP BY d.department ORDER BY department_revenue DESC";
    
    const departmentRevenue = db.prepare(deptQuery).all(...deptParams);

    // Revenue trend (daily)
    let trendQuery = `
      SELECT 
        DATE(mv.visit_date) as revenue_date,
        ROUND(SUM(d.consultation_fee), 2) as daily_revenue,
        COUNT(DISTINCT mv.visit_id) as visits
      FROM medical_visits mv
      JOIN doctors d ON mv.doctor_id = d.doctor_id
      WHERE mv.status = 'completed'
    `;
    
    const trendParams = [];
    
    if (startDate && endDate) {
      trendQuery += " AND DATE(mv.visit_date) >= ? AND DATE(mv.visit_date) <= ?";
      trendParams.push(startDate, endDate);
    }

    trendQuery += " GROUP BY DATE(mv.visit_date) ORDER BY revenue_date";
    
    const revenueTrend = db.prepare(trendQuery).all(...trendParams);

    return {
      totalRevenue: totalRevenue?.total_revenue || 0,
      totalPaidVisits: totalRevenue?.paid_visits || 0,
      byDepartment: departmentRevenue || [],
      trend: revenueTrend || [],
    };
  } catch (error) {
    console.error("Error getting revenue statistics:", error);
    throw error;
  }
};

/**
 * Get patient statistics
 * Shows: total patients registered, new patients, appointments rate
 */
const getPatientStatistics = (startDate, endDate) => {
  try {
    // Total patients
    const totalPatientsQuery = "SELECT COUNT(*) as total_patients FROM patients";
    const totalPatients = db.prepare(totalPatientsQuery).get();

    // New patients in date range
    let newPatientsQuery = "SELECT COUNT(*) as new_patients FROM patients WHERE registration_date >= ? AND registration_date <= ?";
    const newDateStart = startDate ? `${startDate} 00:00:00` : null;
    const newDateEnd = endDate ? `${endDate} 23:59:59` : null;
    
    const newPatients = newDateStart && newDateEnd 
      ? db.prepare(newPatientsQuery).get(newDateStart, newDateEnd)
      : { new_patients: 0 };

    // Patients with visits
    const patientsWithVisitsQuery = "SELECT COUNT(DISTINCT patient_id) as patients_with_visits FROM medical_visits WHERE status = 'completed'";
    const patientsWithVisits = db.prepare(patientsWithVisitsQuery).get();

    // Average visits per patient
    const avgVisitsQuery = "SELECT COUNT(*) as total_visits, COUNT(DISTINCT patient_id) as total_patients, ROUND(COUNT(*) / COUNT(DISTINCT patient_id), 2) as avg_visits_per_patient FROM medical_visits WHERE status = 'completed'";
    const avgVisits = db.prepare(avgVisitsQuery).get();

    // Gender distribution
    let genderQuery = `
      SELECT 
        gender,
        COUNT(*) as count
      FROM patients
    `;
    
    if (startDate && endDate) {
      genderQuery += ` WHERE DATE(registration_date) >= ? AND DATE(registration_date) <= ?`;
    }
    
    genderQuery += " GROUP BY gender";
    
    const genderParams = startDate && endDate ? [startDate, endDate] : [];
    const genderDistribution = db.prepare(genderQuery).all(...genderParams);

    return {
      totalPatients: totalPatients?.total_patients || 0,
      newPatients: newPatients?.new_patients || 0,
      patientsWithVisits: patientsWithVisits?.patients_with_visits || 0,
      avgVisitsPerPatient: avgVisits?.avg_visits_per_patient || 0,
      genderDistribution: genderDistribution || [],
    };
  } catch (error) {
    console.error("Error getting patient statistics:", error);
    throw error;
  }
};

/**
 * Get comprehensive analytics dashboard
 * Combines all analytics in one call
 */
const getComprehensiveAnalytics = (startDate, endDate) => {
  try {
    const visits = getTotalPatientVisits(startDate, endDate);
    const departments = getDepartmentPerformance(startDate, endDate);
    const doctors = getDoctorWorkload(startDate, endDate);
    const revenue = getRevenueStatistics(startDate, endDate);
    const patients = getPatientStatistics(startDate, endDate);

    return {
      success: true,
      dateRange: {
        startDate: startDate || "All Time",
        endDate: endDate || "All Time",
      },
      summary: {
        totalVisits: visits.totalVisits,
        totalPatients: patients.totalPatients,
        totalRevenue: revenue.totalRevenue,
        activeDoctors: doctors.filter(d => d.is_available).length,
        activeDepartments: departments.length,
      },
      visits,
      departments,
      doctors,
      revenue,
      patients,
    };
  } catch (error) {
    console.error("Error getting comprehensive analytics:", error);
    throw error;
  }
};

/**
 * Get top performing doctors
 * Shows: doctors with most visits, highest revenue
 */
const getTopPerformingDoctors = (limit = 5, startDate, endDate) => {
  try {
    let query = `
      SELECT 
        d.doctor_id,
        d.name,
        d.specialization,
        d.department,
        COUNT(DISTINCT mv.visit_id) as total_visits,
        COUNT(DISTINCT mv.patient_id) as unique_patients,
        ROUND(d.consultation_fee * COUNT(DISTINCT mv.visit_id), 2) as revenue
      FROM doctors d
      LEFT JOIN medical_visits mv ON d.doctor_id = mv.doctor_id AND mv.status = 'completed'
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += " AND DATE(mv.visit_date) >= ? AND DATE(mv.visit_date) <= ?";
      params.push(startDate, endDate);
    }

    query += ` GROUP BY d.doctor_id ORDER BY total_visits DESC LIMIT ?`;
    params.push(limit);
    
    const result = db.prepare(query).all(...params);
    return result || [];
  } catch (error) {
    console.error("Error getting top performing doctors:", error);
    throw error;
  }
};

/**
 * Get diagnostic report statistics
 * Shows: report types, urgency levels, trends
 */
const getDiagnosticStatistics = (startDate, endDate) => {
  try {
    // Reports by type
    let typeQuery = `
      SELECT 
        report_type,
        COUNT(*) as count,
        COUNT(CASE WHEN urgency_level = 'Critical' THEN 1 END) as critical_count
      FROM diagnostic_reports
      WHERE report_date IS NOT NULL
    `;
    
    const typeParams = [];
    
    if (startDate && endDate) {
      typeQuery += " AND DATE(report_date) >= ? AND DATE(report_date) <= ?";
      typeParams.push(startDate, endDate);
    }

    typeQuery += " GROUP BY report_type ORDER BY count DESC";
    
    const reportsByType = db.prepare(typeQuery).all(...typeParams);

    // Urgency distribution
    let urgencyQuery = `
      SELECT 
        urgency_level,
        COUNT(*) as count
      FROM diagnostic_reports
      WHERE report_date IS NOT NULL
    `;
    
    const urgencyParams = [];
    
    if (startDate && endDate) {
      urgencyQuery += " AND DATE(report_date) >= ? AND DATE(report_date) <= ?";
      urgencyParams.push(startDate, endDate);
    }

    urgencyQuery += " GROUP BY urgency_level";
    
    const urgencyDistribution = db.prepare(urgencyQuery).all(...urgencyParams);

    return {
      byType: reportsByType || [],
      byUrgency: urgencyDistribution || [],
      totalReports: reportsByType.reduce((sum, r) => sum + r.count, 0),
    };
  } catch (error) {
    console.error("Error getting diagnostic statistics:", error);
    throw error;
  }
};

/**
 * Search for patients by name or ID
 * @param {string} searchQuery - Patient name or Smart Patient ID
 */
const searchPatients = (searchQuery) => {
  try {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const query = `
      SELECT 
        patient_id,
        smart_patient_id,
        first_name,
        last_name,
        gender,
        blood_type,
        phone_number,
        email,
        date_of_birth,
        registration_date
      FROM patients
      WHERE 
        smart_patient_id LIKE ? 
        OR first_name LIKE ? 
        OR last_name LIKE ?
      LIMIT 20
    `;

    const searchTerm = `%${searchQuery}%`;
    const results = db.prepare(query).all(searchTerm, searchTerm, searchTerm);
    
    return results || [];
  } catch (error) {
    console.error("Error searching patients:", error);
    throw error;
  }
};

/**
 * Get individual patient's medical timeline and analytics contribution
 * @param {number|string} patientId - Patient ID or Smart Patient ID
 */
const getPatientAnalytics = (patientId) => {
  try {
    // Get patient info
    let patientQuery = `
      SELECT * FROM patients 
      WHERE patient_id = ? OR smart_patient_id = ?
    `;
    const patient = db.prepare(patientQuery).get(patientId, patientId);

    if (!patient) {
      return { error: "Patient not found" };
    }

    // Get patient's medical visits
    const visitsQuery = `
      SELECT 
        visit_id,
        patient_id,
        doctor_id,
        visit_date,
        reason_for_visit,
        status,
        notes
      FROM medical_visits
      WHERE patient_id = ?
      ORDER BY visit_date DESC
    `;
    const visits = db.prepare(visitsQuery).all(patient.patient_id) || [];

    // Get patient's diagnostic reports
    const diagnosticsQuery = `
      SELECT 
        report_id,
        patient_id,
        doctor_id,
        report_date,
        report_type,
        findings,
        urgency_level
      FROM diagnostic_reports
      WHERE patient_id = ?
      ORDER BY report_date DESC
    `;
    const diagnostics = db.prepare(diagnosticsQuery).all(patient.patient_id) || [];

    // Get patient's prescriptions
    const prescriptionsQuery = `
      SELECT 
        prescription_id,
        patient_id,
        doctor_id,
        prescription_date,
        medication_name,
        dosage,
        duration_days,
        status
      FROM prescriptions
      WHERE patient_id = ?
      ORDER BY prescription_date DESC
    `;
    const prescriptions = db.prepare(prescriptionsQuery).all(patient.patient_id) || [];

    // Get patient's treatment timeline
    const timelineQuery = `
      SELECT 
        timeline_id,
        patient_id,
        visit_id,
        event_date,
        event_type,
        description,
        notes
      FROM treatment_timeline
      WHERE patient_id = ?
      ORDER BY event_date DESC
    `;
    const timeline = db.prepare(timelineQuery).all(patient.patient_id) || [];

    // Calculate patient's contribution to analytics
    const doctorForPatient = visits.length > 0 ? db.prepare(`
      SELECT doctor_id FROM medical_visits WHERE patient_id = ? LIMIT 1
    `).get(patient.patient_id) : null;

    return {
      success: true,
      patient: {
        patientId: patient.patient_id,
        smartPatientId: patient.smart_patient_id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        bloodType: patient.blood_type,
        phoneNumber: patient.phone_number,
        email: patient.email,
        registrationDate: patient.registration_date,
      },
      medicalTimeline: {
        totalVisits: visits.length,
        totalDiagnostics: diagnostics.length,
        totalPrescriptions: prescriptions.length,
        visits: visits.slice(0, 10), // Last 10 visits
        diagnostics: diagnostics.slice(0, 10), // Last 10 diagnostics
        prescriptions: prescriptions.slice(0, 10), // Last 10 prescriptions
        timeline: timeline.slice(0, 20), // Last 20 timeline events
      },
      analyticsContribution: {
        visitCount: visits.length,
        diagnosticCount: diagnostics.length,
        prescriptionCount: prescriptions.length,
        registrationDate: patient.registration_date,
        lastVisitDate: visits.length > 0 ? visits[0].visit_date : null,
      },
    };
  } catch (error) {
    console.error("Error getting patient analytics:", error);
    throw error;
  }
};

module.exports = {
  getTotalPatientVisits,
  getDepartmentPerformance,
  getDoctorWorkload,
  getRevenueStatistics,
  getPatientStatistics,
  getComprehensiveAnalytics,
  getTopPerformingDoctors,
  getDiagnosticStatistics,
  searchPatients,
  getPatientAnalytics,
};
