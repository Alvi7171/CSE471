/**
 * Hospital Analytics Routes
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 * Purpose: API endpoints for analytics dashboards
 */

const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

/**
 * @route   GET /analytics/comprehensive
 * @desc    Get comprehensive analytics dashboard
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/comprehensive", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = analyticsController.getComprehensiveAnalytics(startDate, endDate);
    res.json(analytics);
  } catch (error) {
    console.error("Error in comprehensive analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch comprehensive analytics",
    });
  }
});

/**
 * @route   GET /analytics/visits
 * @desc    Get total patient visits with trend data
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/visits", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const visits = analyticsController.getTotalPatientVisits(startDate, endDate);
    res.json({
      success: true,
      data: visits,
    });
  } catch (error) {
    console.error("Error fetching visit analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch visit analytics",
    });
  }
});

/**
 * @route   GET /analytics/departments
 * @desc    Get department performance metrics
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/departments", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const departments = analyticsController.getDepartmentPerformance(startDate, endDate);
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Error fetching department analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch department analytics",
    });
  }
});

/**
 * @route   GET /analytics/doctors-workload
 * @desc    Get doctor workload metrics
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/doctors-workload", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workload = analyticsController.getDoctorWorkload(startDate, endDate);
    res.json({
      success: true,
      data: workload,
    });
  } catch (error) {
    console.error("Error fetching doctor workload analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch doctor workload analytics",
    });
  }
});

/**
 * @route   GET /analytics/revenue
 * @desc    Get revenue statistics
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/revenue", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const revenue = analyticsController.getRevenueStatistics(startDate, endDate);
    res.json({
      success: true,
      data: revenue,
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch revenue analytics",
    });
  }
});

/**
 * @route   GET /analytics/patients
 * @desc    Get patient statistics
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/patients", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const patients = analyticsController.getPatientStatistics(startDate, endDate);
    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    console.error("Error fetching patient analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch patient analytics",
    });
  }
});

/**
 * @route   GET /analytics/top-doctors
 * @desc    Get top performing doctors
 * @query   limit (optional) - default 5
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/top-doctors", (req, res) => {
  try {
    const { limit = 5, startDate, endDate } = req.query;
    const doctors = analyticsController.getTopPerformingDoctors(
      parseInt(limit),
      startDate,
      endDate
    );
    res.json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.error("Error fetching top doctors:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch top doctors",
    });
  }
});

/**
 * @route   GET /analytics/diagnostics
 * @desc    Get diagnostic report statistics
 * @query   startDate (optional) - YYYY-MM-DD format
 * @query   endDate (optional) - YYYY-MM-DD format
 * @access  Public
 */
router.get("/diagnostics", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const diagnostics = analyticsController.getDiagnosticStatistics(startDate, endDate);
    res.json({
      success: true,
      data: diagnostics,
    });
  } catch (error) {
    console.error("Error fetching diagnostic analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch diagnostic analytics",
    });
  }
});

module.exports = router;
