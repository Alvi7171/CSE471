-- =====================================================
-- STAFF & DUTY ROSTER MANAGEMENT MODULE (MySQL)
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_members (
  staff_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  employee_id VARCHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(180) NULL,
  phone VARCHAR(30) NULL,
  department VARCHAR(120) NOT NULL,
  role ENUM('doctor', 'nurse', 'technician', 'administrator', 'receptionist', 'other') NOT NULL,
  designation VARCHAR(150) NULL,
  employment_status ENUM('active', 'inactive', 'on_leave', 'terminated') DEFAULT 'active',
  hire_date DATE NULL,
  is_on_duty TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_members_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  shift_id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  department VARCHAR(120) NOT NULL,
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  shift_type ENUM('morning', 'afternoon', 'night', 'overnight', 'emergency', 'regular') DEFAULT 'regular',
  status ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shifts_staff FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_shift (staff_id, shift_date, shift_start_time)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  shift_id INT NULL,
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present', 'absent', 'late', 'early_leave', 'on_leave', 'half_day') DEFAULT 'present',
  hours_worked DECIMAL(5, 2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_staff FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_shift FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE SET NULL,
  UNIQUE KEY unique_staff_attendance_day (staff_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS staff_availability (
  availability_id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL UNIQUE,
  availability_status ENUM('on_duty', 'on_break', 'in_meeting', 'on_call', 'off_duty', 'on_leave') DEFAULT 'on_duty',
  current_location VARCHAR(180) NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INT NULL,
  CONSTRAINT fk_staff_availability_staff FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_availability_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  sync_id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NULL,
  shift_id INT NULL,
  appointment_id INT NULL,
  calendar_event_id VARCHAR(255) NULL,
  sync_type ENUM('shift', 'appointment', 'unavailability') NOT NULL,
  status ENUM('pending', 'synced', 'failed', 'removed') DEFAULT 'synced',
  error_message TEXT NULL,
  last_sync_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_calendar_sync_staff FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id) ON DELETE CASCADE,
  CONSTRAINT fk_calendar_sync_shift FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE CASCADE,
  CONSTRAINT fk_calendar_sync_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE
);

CREATE INDEX idx_shifts_staff_date ON shifts(staff_id, shift_date);
CREATE INDEX idx_shifts_department_date ON shifts(department, shift_date);
CREATE INDEX idx_attendance_staff_date ON attendance_logs(staff_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance_logs(attendance_date);
CREATE INDEX idx_staff_members_department ON staff_members(department);
CREATE INDEX idx_calendar_sync_shift ON calendar_sync_logs(shift_id);
