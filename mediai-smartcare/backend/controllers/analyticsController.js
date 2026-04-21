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
    let query =
      "SELECT COUNT(*) as total_visits, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_visits, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_visits FROM appointments WHERE 1=1";
    const params = [];

    if (startDate && endDate) {
      query +=
        " AND DATE(appointment_date) >= ? AND DATE(appointment_date) <= ?";
      params.push(startDate, endDate);
    }

    const result = db.prepare(query).get(...params);

    // Get visits by day for trend analysis
    let trendQuery =
      "SELECT DATE(appointment_date) as visit_day, COUNT(*) as total_visits, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_visits FROM appointments WHERE 1=1";
    const trendParams = [];

    if (startDate && endDate) {
      trendQuery +=
        " AND DATE(appointment_date) >= ? AND DATE(appointment_date) <= ?";
      trendParams.push(startDate, endDate);
    }

    trendQuery += " GROUP BY DATE(appointment_date) ORDER BY visit_day";
    const trendData = db.prepare(trendQuery).all(...trendParams);

    return {
      totalVisits: result.total_visits || 0,
      completedVisits: result.completed_visits || 0,
      pendingVisits: result.pending_visits || 0,
      trend: trendData || [],
    };
  } catch (error) {
    console.error("Error getting total patient visits:", error);
    throw error;
  }
};

/**
 * Get department performance metrics
 * Shows: active doctors per department, total visits, revenue, average consultation fee
 */
const getDepartmentPerformance = (startDate, endDate) => {
  try {
    let query = `
      SELECT 
        d.department,
        COUNT(DISTINCT d.doctor_id) as total_doctors,
        COUNT(DISTINCT CASE WHEN d.is_available = 1 THEN d.doctor_id END) as available_doctors,
        COUNT(DISTINCT a.appointment_id) as total_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.appointment_id END) as completed_appointments,
        ROUND(SUM(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE 0 END), 2) as department_revenue,
        ROUND(AVG(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE NULL END), 2) as avg_consultation_fee
      FROM doctors d
      LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
    `;

    const params = [];

    if (startDate && endDate) {
      query +=
        " WHERE DATE(a.appointment_date) >= ? AND DATE(a.appointment_date) <= ?";
      params.push(startDate, endDate);
    }

    query += " GROUP BY d.department ORDER BY department_revenue DESC";

    const result = db.prepare(query).all(...params);
    return result || [];
  } catch (error) {
    console.error("Error getting department performance:", error);
    throw error;
  }
};

/**
 * Get doctor workload metrics
 * Shows: number of visits per doctor, patient load, average consultation fee, revenue
 */
const getDoctorWorkload = (startDate, endDate) => {
  try {
    let query = `
      SELECT 
        d.doctor_id,
        d.name,
        d.department,
        d.specialization,
        COUNT(DISTINCT a.appointment_id) as total_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.appointment_id END) as completed_appointments,
        COUNT(DISTINCT a.patient_user_id) as unique_patients,
        d.consultation_fee as fee_per_appointment,
        ROUND(d.consultation_fee * COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.appointment_id END), 2) as doctor_revenue,
        ROUND(AVG(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE NULL END), 2) as avg_fee,
        d.is_available,
        d.experience_years
      FROM doctors d
      LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
    `;

    const params = [];

    if (startDate && endDate) {
      query +=
        " WHERE DATE(a.appointment_date) >= ? AND DATE(a.appointment_date) <= ?";
      params.push(startDate, endDate);
    }

    query += " GROUP BY d.doctor_id, d.name ORDER BY completed_appointments DESC";

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
    // Total revenue - Calculate revenue per completed appointment
    let totalQuery = `
      SELECT 
        COUNT(DISTINCT a.appointment_id) as total_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.appointment_id END) as completed_visits,
        ROUND(SUM(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE 0 END), 2) as total_revenue,
        ROUND(AVG(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE NULL END), 2) as avg_revenue_per_visit
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE 1=1
    `;

    const totalParams = [];

    if (startDate && endDate) {
      totalQuery +=
        " AND DATE(a.appointment_date) >= ? AND DATE(a.appointment_date) <= ?";
      totalParams.push(startDate, endDate);
    }

    const totalRevenue = db.prepare(totalQuery).get(...totalParams);

    // Revenue by department - Calculate per completed appointment
    let deptQuery = `
      SELECT 
        d.department,
        COUNT(DISTINCT a.appointment_id) as total_appointments,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.appointment_id END) as completed_visits,
        ROUND(SUM(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE 0 END), 2) as department_revenue,
        ROUND(AVG(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE NULL END), 2) as avg_fee
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE 1=1
    `;

    const deptParams = [];

    if (startDate && endDate) {
      deptQuery +=
        " AND DATE(a.appointment_date) >= ? AND DATE(a.appointment_date) <= ?";
      deptParams.push(startDate, endDate);
    }

    deptQuery += " GROUP BY d.department ORDER BY department_revenue DESC";

    const departmentRevenue = db.prepare(deptQuery).all(...deptParams);

    // Revenue trend (daily) - Calculate per completed appointment per day
    let trendQuery = `
      SELECT 
        DATE(a.appointment_date) as revenue_date,
        COUNT(DISTINCT a.appointment_id) as total_visits,
        COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.appointment_id END) as completed_visits,
        ROUND(SUM(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE 0 END), 2) as daily_revenue,
        ROUND(AVG(CASE WHEN a.status = 'completed' THEN d.consultation_fee ELSE NULL END), 2) as avg_daily_fee
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE 1=1
    `;

    const trendParams = [];

    if (startDate && endDate) {
      trendQuery +=
        " AND DATE(a.appointment_date) >= ? AND DATE(a.appointment_date) <= ?";
      trendParams.push(startDate, endDate);
    }

    trendQuery += " GROUP BY DATE(a.appointment_date) ORDER BY revenue_date";

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
    const totalPatientsQuery =
      "SELECT COUNT(*) as total_patients FROM users WHERE role = 'patient'";
    const totalPatients = db.prepare(totalPatientsQuery).get();

    // New patients in date range
    let newPatientsQuery =
      "SELECT COUNT(*) as new_patients FROM users WHERE role = 'patient'";
    const newParams = [];

    if (startDate && endDate) {
      newPatientsQuery +=
        " AND DATE(created_at) >= ? AND DATE(created_at) <= ?";
      newParams.push(startDate, endDate);
    }

    const newPatients = db.prepare(newPatientsQuery).get(...newParams);

    // Patients with completed and pending appointments
    const appointmentsStatsQuery = `
      SELECT 
        COUNT(DISTINCT patient_user_id) as patients_with_appointments,
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN patient_user_id END) as patients_with_completed,
        COUNT(DISTINCT CASE WHEN status = 'pending' THEN patient_user_id END) as patients_with_pending
      FROM appointments 
      WHERE patient_user_id IS NOT NULL
    `;
    const appointmentsStats = db.prepare(appointmentsStatsQuery).get();

    // Average appointments per patient
    const avgAppointmentsQuery = `
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(DISTINCT patient_user_id) as total_patients,
        ROUND(COUNT(*) / NULLIF(COUNT(DISTINCT patient_user_id), 0), 2) as avg_appointments_per_patient,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments
      FROM appointments 
      WHERE patient_user_id IS NOT NULL
    `;
    const avgAppointments = db.prepare(avgAppointmentsQuery).get();

    // Gender distribution
    let genderQuery = `
      SELECT 
        CASE 
          WHEN gender IS NULL OR gender = '' THEN 'Not Specified'
          ELSE gender
        END as gender,
        COUNT(*) as count
      FROM users WHERE role = 'patient'
    `;

    if (startDate && endDate) {
      genderQuery += ` AND DATE(created_at) >= ? AND DATE(created_at) <= ?`;
    }

    genderQuery += " GROUP BY gender";

    const genderParams = startDate && endDate ? [startDate, endDate] : [];
    const genderDistribution = db.prepare(genderQuery).all(...genderParams);

    return {
      totalPatients: totalPatients?.total_patients || 0,
      newPatients: newPatients?.new_patients || 0,
      patientsWithAppointments: appointmentsStats?.patients_with_appointments || 0,
      patientsWithCompleted: appointmentsStats?.patients_with_completed || 0,
      patientsWithPending: appointmentsStats?.patients_with_pending || 0,
      avgAppointmentsPerPatient:
        avgAppointments?.avg_appointments_per_patient || 0,
      totalAppointments: avgAppointments?.total_appointments || 0,
      completedAppointments: avgAppointments?.completed_appointments || 0,
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
        activeDoctors: doctors.filter((d) => d.is_available).length,
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
 * @param {string} searchQuery - Patient name or user ID
 */
const searchPatients = (searchQuery) => {
  try {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const query = `
      SELECT 
        user_id,
        full_name,
        email,
        phone,
        address,
        age,
        gender,
        created_at
      FROM users
      WHERE role = 'patient' AND (
        full_name LIKE ? 
        OR email LIKE ?
        OR phone LIKE ?
      )
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
 * @param {number|string} patientId - Patient user ID
 */
const getPatientAnalytics = (patientId) => {
  try {
    // Get patient info from users table
    let patientQuery = `
      SELECT * FROM users 
      WHERE user_id = ? AND role = 'patient'
    `;
    const patient = db.prepare(patientQuery).get(patientId);

    if (!patient) {
      return { error: "Patient not found" };
    }

    // Get patient's appointments with doctor details
    const appointmentsQuery = `
      SELECT 
        a.appointment_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.symptoms,
        a.status,
        d.name as doctor_name,
        d.department,
        d.specialization
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.patient_user_id = ?
      ORDER BY a.appointment_date DESC
    `;
    const appointments = db.prepare(appointmentsQuery).all(patientId) || [];

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_appointments
      FROM appointments
      WHERE patient_user_id = ?
    `;
    const stats = db.prepare(statsQuery).get(patientId) || {};

    // Get doctors visited
    const doctorsVisitedQuery = `
      SELECT DISTINCT d.doctor_id, d.name, d.department, d.specialization
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.patient_user_id = ?
      ORDER BY d.name
    `;
    const doctorsVisited = db.prepare(doctorsVisitedQuery).all(patientId) || [];

    return {
      success: true,
      patient: {
        userId: patient.user_id,
        fullName: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        age: patient.age,
        gender: patient.gender,
        registrationDate: patient.created_at,
      },
      appointmentHistory: {
        totalAppointments: stats.total_appointments || 0,
        completedAppointments: stats.completed_appointments || 0,
        pendingAppointments: stats.pending_appointments || 0,
        appointments: appointments || [],
      },
      doctorsVisited: doctorsVisited || [],
      analyticsContribution: {
        appointmentCount: stats.total_appointments || 0,
        doctorCount: doctorsVisited.length,
        registrationDate: patient.created_at,
        lastAppointmentDate: appointments.length > 0 ? appointments[0].appointment_date : null,
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
