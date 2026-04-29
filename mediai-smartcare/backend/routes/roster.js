/**
 * Staff & Duty Roster Management Routes
 * API endpoints for shift scheduling, attendance, and availability
 */

const express = require("express");
const router = express.Router();
const rosterController = require("../controllers/rosterController");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * POST /api/roster/staff
 * Create a new staff member
 */
router.post("/staff", requireAuth, (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      role,
      designation,
      hireDate,
      userId,
    } = req.body;

    if (!firstName || !lastName || !department || !role) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, department, and role are required",
      });
    }

    const staff = rosterController.createStaffMember(
      firstName,
      lastName,
      email,
      phone,
      department,
      role,
      designation,
      hireDate,
      userId,
    );

    res.status(201).json({
      success: true,
      data: staff,
      message: "Staff member created successfully",
    });
  } catch (error) {
    console.error("Error creating staff member:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/roster/shift
 * Create a shift for a staff member
 */
router.post("/shift", requireAuth, (req, res) => {
  try {
    const {
      staffId,
      department,
      shiftDate,
      shiftStartTime,
      shiftEndTime,
      shiftType,
    } = req.body;

    if (
      !staffId ||
      !department ||
      !shiftDate ||
      !shiftStartTime ||
      !shiftEndTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "staffId, department, shiftDate, shiftStartTime, and shiftEndTime are required",
      });
    }

    const shift = rosterController.createShift(
      staffId,
      department,
      shiftDate,
      shiftStartTime,
      shiftEndTime,
      shiftType,
    );

    res.status(201).json({
      success: true,
      data: shift,
      message: "Shift created successfully",
    });
  } catch (error) {
    console.error("Error creating shift:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/roster/staff/:staffId/shifts
 * Get staff member's shifts for a date range
 */
router.get("/staff/:staffId/shifts", requireAuth, (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const shifts = rosterController.getStaffShifts(staffId, startDate, endDate);

    res.json({
      success: true,
      data: shifts,
      count: shifts.length,
    });
  } catch (error) {
    console.error("Error getting staff shifts:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/roster/department/:department/shifts
 * Get all shifts for a department on a date
 */
router.get("/department/:department/shifts", requireAuth, (req, res) => {
  try {
    const { department } = req.params;
    const { shiftDate } = req.query;

    if (!shiftDate) {
      return res.status(400).json({
        success: false,
        message: "shiftDate is required",
      });
    }

    const shifts = rosterController.getDepartmentShifts(department, shiftDate);

    res.json({
      success: true,
      data: shifts,
      count: shifts.length,
    });
  } catch (error) {
    console.error("Error getting department shifts:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/roster/attendance/check-in
 * Record staff check-in
 */
router.post("/attendance/check-in", requireAuth, (req, res) => {
  try {
    const { staffId, shiftId, notes } = req.body;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "staffId is required",
      });
    }

    const attendance = rosterController.checkInStaff(staffId, shiftId, notes);

    res.status(201).json({
      success: true,
      data: attendance,
      message: "Check-in recorded successfully",
    });
  } catch (error) {
    console.error("Error in check-in:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/roster/attendance/check-out
 * Record staff check-out
 */
router.post("/attendance/check-out", requireAuth, (req, res) => {
  try {
    const { staffId, notes } = req.body;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "staffId is required",
      });
    }

    const attendance = rosterController.checkOutStaff(staffId, notes);

    res.status(200).json({
      success: true,
      data: attendance,
      message: "Check-out recorded successfully",
    });
  } catch (error) {
    console.error("Error in check-out:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/roster/staff/:staffId/attendance
 * Get attendance records for a staff member
 */
router.get("/staff/:staffId/attendance", requireAuth, (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const attendance = rosterController.getStaffAttendance(
      staffId,
      startDate,
      endDate,
    );

    res.json({
      success: true,
      data: attendance,
      count: attendance.length,
    });
  } catch (error) {
    console.error("Error getting staff attendance:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/roster/staff/:staffId/availability
 * Get staff member's availability status
 */
router.get("/staff/:staffId/availability", requireAuth, (req, res) => {
  try {
    const { staffId } = req.params;

    const availability = rosterController.getStaffAvailability(staffId);

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Error getting staff availability:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/roster/staff/:staffId/availability
 * Update staff member's availability status
 */
router.put("/staff/:staffId/availability", requireAuth, (req, res) => {
  try {
    const { staffId } = req.params;
    const { status, location, updatedBy } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    const availability = rosterController.updateStaffAvailability(
      staffId,
      status,
      location,
      updatedBy,
    );

    res.json({
      success: true,
      data: availability,
      message: "Availability updated successfully",
    });
  } catch (error) {
    console.error("Error updating staff availability:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/roster/analytics
 * Get roster analytics for dashboard
 */
router.get("/analytics", requireAuth, (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const analytics = rosterController.getRosterAnalytics(
      startDate,
      endDate,
      department,
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error getting roster analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
