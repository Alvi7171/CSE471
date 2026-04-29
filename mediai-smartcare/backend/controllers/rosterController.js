/**
 * Staff & Duty Roster Management Controller
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 * Purpose: Manage staff shifts, attendance, and availability
 */

const { db } = require("../config/database");

/**
 * Create or update staff member
 */
const createStaffMember = (
  firstName,
  lastName,
  email,
  phone,
  department,
  role,
  designation,
  hireDate,
  userId = null,
) => {
  try {
    const employeeId = `EMP-${Date.now()}`;

    const stmt = db.prepare(`
      INSERT INTO staff_members (
        user_id, employee_id, first_name, last_name, email, phone,
        department, role, designation, hire_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      department,
      role,
      designation,
      hireDate,
    );

    return {
      staffId: result.lastInsertRowid,
      employeeId,
      firstName,
      lastName,
      department,
      role,
    };
  } catch (error) {
    console.error("Error creating staff member:", error);
    throw error;
  }
};

/**
 * Create shift for staff member
 * Includes conflict prevention logic
 */
const createShift = (
  staffId,
  department,
  shiftDate,
  shiftStartTime,
  shiftEndTime,
  shiftType = "regular",
) => {
  try {
    // Check for conflicts with existing shifts
    const conflictQuery = `
      SELECT COUNT(*) as conflict_count FROM shifts
      WHERE staff_id = ? AND shift_date = ?
      AND status NOT IN ('cancelled')
    `;
    const conflict = db.prepare(conflictQuery).get(staffId, shiftDate);

    if (conflict.conflict_count > 0) {
      throw new Error(
        "Staff member already has a shift scheduled for this date",
      );
    }

    // Check for conflicts with appointments
    const appointmentQuery = `
      SELECT COUNT(*) as appointment_count FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      JOIN staff_members s ON d.doctor_id = s.user_id
      WHERE s.staff_id = ? AND DATE(a.appointment_date) = ?
      AND a.status NOT IN ('cancelled', 'declined')
    `;
    const appointment = db.prepare(appointmentQuery).get(staffId, shiftDate);

    if (appointment.appointment_count > 0) {
      throw new Error("Staff member has appointments scheduled for this date");
    }

    // Create shift
    const stmt = db.prepare(`
      INSERT INTO shifts (
        staff_id, department, shift_date, shift_start_time, shift_end_time,
        shift_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
    `);

    const result = stmt.run(
      staffId,
      department,
      shiftDate,
      shiftStartTime,
      shiftEndTime,
      shiftType,
    );

    return {
      shiftId: result.lastInsertRowid,
      staffId,
      shiftDate,
      shiftStartTime,
      shiftEndTime,
      status: "scheduled",
    };
  } catch (error) {
    console.error("Error creating shift:", error);
    throw error;
  }
};

/**
 * Get staff member's shifts for a date range
 */
const getStaffShifts = (staffId, startDate, endDate) => {
  try {
    const query = `
      SELECT s.*, sm.first_name, sm.last_name, sm.department, sm.role
      FROM shifts s
      JOIN staff_members sm ON s.staff_id = sm.staff_id
      WHERE s.staff_id = ? AND s.shift_date >= ? AND s.shift_date <= ?
      ORDER BY s.shift_date ASC, s.shift_start_time ASC
    `;
    return db.prepare(query).all(staffId, startDate, endDate);
  } catch (error) {
    console.error("Error getting staff shifts:", error);
    throw error;
  }
};

/**
 * Get all shifts for a department on a date
 */
const getDepartmentShifts = (department, shiftDate) => {
  try {
    const query = `
      SELECT s.*, sm.first_name, sm.last_name, sm.role, sm.employment_status
      FROM shifts s
      JOIN staff_members sm ON s.staff_id = sm.staff_id
      WHERE sm.department = ? AND s.shift_date = ?
      AND s.status NOT IN ('cancelled')
      ORDER BY s.shift_start_time ASC
    `;
    return db.prepare(query).all(department, shiftDate);
  } catch (error) {
    console.error("Error getting department shifts:", error);
    throw error;
  }
};

/**
 * Record attendance check-in
 */
const checkInStaff = (staffId, shiftId = null, notes = null) => {
  try {
    const attendanceDate = new Date().toISOString().split("T")[0];
    const checkInTime = new Date().toISOString();

    // Check if already checked in today
    const existingQuery = `
      SELECT attendance_id FROM attendance_logs
      WHERE staff_id = ? AND attendance_date = ?
    `;
    const existing = db.prepare(existingQuery).get(staffId, attendanceDate);

    if (existing) {
      throw new Error("Staff member already checked in today");
    }

    // Create attendance log
    const stmt = db.prepare(`
      INSERT INTO attendance_logs (
        staff_id, shift_id, check_in_time, attendance_date, status, notes
      ) VALUES (?, ?, ?, ?, 'present', ?)
    `);

    const result = stmt.run(
      staffId,
      shiftId,
      checkInTime,
      attendanceDate,
      notes,
    );

    // Update staff availability
    const availabilityQuery = `
      SELECT * FROM staff_availability WHERE staff_id = ?
    `;
    const existingAvailability = db.prepare(availabilityQuery).get(staffId);

    if (existingAvailability) {
      const updateStmt = db.prepare(`
        UPDATE staff_availability 
        SET availability_status = 'on_duty', last_updated = CURRENT_TIMESTAMP
        WHERE staff_id = ?
      `);
      updateStmt.run(staffId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO staff_availability (
          staff_id, availability_status, last_updated
        ) VALUES (?, 'on_duty', CURRENT_TIMESTAMP)
      `);
      insertStmt.run(staffId);
    }

    return {
      attendanceId: result.lastInsertRowid,
      status: "checked_in",
      checkInTime,
    };
  } catch (error) {
    console.error("Error checking in staff:", error);
    throw error;
  }
};

/**
 * Record attendance check-out
 */
const checkOutStaff = (staffId, notes = null) => {
  try {
    const attendanceDate = new Date().toISOString().split("T")[0];
    const checkOutTime = new Date().toISOString();

    // Find today's attendance record
    const query = `
      SELECT * FROM attendance_logs
      WHERE staff_id = ? AND attendance_date = ?
    `;
    const attendance = db.prepare(query).get(staffId, attendanceDate);

    if (!attendance) {
      throw new Error("No check-in record found for today");
    }

    // Calculate hours worked
    const checkInTime = new Date(attendance.check_in_time);
    const checkOut = new Date(checkOutTime);
    const hoursWorked = (checkOut - checkInTime) / (1000 * 60 * 60);

    // Update attendance log
    const stmt = db.prepare(`
      UPDATE attendance_logs
      SET check_out_time = ?, hours_worked = ?, notes = ?
      WHERE attendance_id = ?
    `);

    stmt.run(
      checkOutTime,
      Math.round(hoursWorked * 100) / 100,
      notes,
      attendance.attendance_id,
    );

    // Update staff availability
    const updateStmt = db.prepare(`
      UPDATE staff_availability
      SET availability_status = 'off_duty', last_updated = CURRENT_TIMESTAMP
      WHERE staff_id = ?
    `);
    updateStmt.run(staffId);

    return {
      attendanceId: attendance.attendance_id,
      status: "checked_out",
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    };
  } catch (error) {
    console.error("Error checking out staff:", error);
    throw error;
  }
};

/**
 * Get attendance records for staff member
 */
const getStaffAttendance = (staffId, startDate, endDate) => {
  try {
    const query = `
      SELECT a.*, sm.first_name, sm.last_name
      FROM attendance_logs a
      JOIN staff_members sm ON a.staff_id = sm.staff_id
      WHERE a.staff_id = ? AND a.attendance_date >= ? AND a.attendance_date <= ?
      ORDER BY a.attendance_date DESC
    `;
    return db.prepare(query).all(staffId, startDate, endDate);
  } catch (error) {
    console.error("Error getting staff attendance:", error);
    throw error;
  }
};

/**
 * Get staff availability status
 */
const getStaffAvailability = (staffId) => {
  try {
    const query = `
      SELECT * FROM staff_availability WHERE staff_id = ?
    `;
    return db.prepare(query).get(staffId);
  } catch (error) {
    console.error("Error getting staff availability:", error);
    throw error;
  }
};

/**
 * Update staff availability status
 */
const updateStaffAvailability = (
  staffId,
  status,
  location = null,
  updatedBy = null,
) => {
  try {
    const existingQuery = `
      SELECT * FROM staff_availability WHERE staff_id = ?
    `;
    const existing = db.prepare(existingQuery).get(staffId);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE staff_availability
        SET availability_status = ?, current_location = ?, 
            last_updated = CURRENT_TIMESTAMP, updated_by = ?
        WHERE staff_id = ?
      `);
      stmt.run(status, location, updatedBy, staffId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO staff_availability (
          staff_id, availability_status, current_location, updated_by, last_updated
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(staffId, status, location, updatedBy);
    }

    return {
      staffId,
      status,
      location,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error updating staff availability:", error);
    throw error;
  }
};

/**
 * Get roster analytics
 */
const getRosterAnalytics = (startDate, endDate, department = null) => {
  try {
    // Staff count by department
    const staffCountQuery = `
      SELECT 
        department,
        COUNT(DISTINCT staff_id) as total_staff,
        COUNT(DISTINCT CASE WHEN employment_status = 'active' THEN staff_id END) as active_staff
      FROM staff_members
      WHERE 1=1
    `;

    let staffQuery = staffCountQuery;
    const staffParams = [];

    if (department) {
      staffQuery += " AND department = ?";
      staffParams.push(department);
    }

    staffQuery += " GROUP BY department";

    const staffCounts = db.prepare(staffQuery).all(...staffParams);

    // Shifts summary
    const shiftsQuery = `
      SELECT 
        sh.department,
        COUNT(DISTINCT sh.shift_id) as total_shifts,
        COUNT(DISTINCT CASE WHEN sh.status = 'completed' THEN sh.shift_id END) as completed_shifts,
        COUNT(DISTINCT CASE WHEN sh.status = 'in_progress' THEN sh.shift_id END) as in_progress_shifts
      FROM shifts sh
      WHERE sh.shift_date >= ? AND sh.shift_date <= ?
    `;

    let shiftsQry = shiftsQuery;
    const shiftsParams = [startDate, endDate];

    if (department) {
      shiftsQry += " AND sh.department = ?";
      shiftsParams.push(department);
    }

    shiftsQry += " GROUP BY sh.department";

    const shiftsData = db.prepare(shiftsQry).all(...shiftsParams);

    // Attendance summary
    const attendanceQuery = `
      SELECT 
        COUNT(DISTINCT al.attendance_id) as total_attendance_records,
        COUNT(DISTINCT CASE WHEN al.status = 'present' THEN al.attendance_id END) as present_count,
        COUNT(DISTINCT CASE WHEN al.status = 'absent' THEN al.attendance_id END) as absent_count,
        COUNT(DISTINCT CASE WHEN al.status = 'late' THEN al.attendance_id END) as late_count,
        COUNT(DISTINCT CASE WHEN al.status = 'half_day' THEN al.attendance_id END) as half_day_count,
        ROUND(AVG(al.hours_worked), 2) as avg_hours_worked
      FROM attendance_logs al
      WHERE al.attendance_date >= ? AND al.attendance_date <= ?
    `;

    const attendanceData = db.prepare(attendanceQuery).get(startDate, endDate);

    // On-duty staff count right now
    const onDutyQuery = `
      SELECT COUNT(DISTINCT staff_id) as on_duty_count
      FROM staff_availability
      WHERE availability_status = 'on_duty'
    `;
    const onDutyCount = db.prepare(onDutyQuery).get();

    return {
      staffCounts,
      shiftsData,
      attendanceData,
      onDutyCount: onDutyCount.on_duty_count,
    };
  } catch (error) {
    console.error("Error getting roster analytics:", error);
    throw error;
  }
};

module.exports = {
  createStaffMember,
  createShift,
  getStaffShifts,
  getDepartmentShifts,
  checkInStaff,
  checkOutStaff,
  getStaffAttendance,
  getStaffAvailability,
  updateStaffAvailability,
  getRosterAnalytics,
};
