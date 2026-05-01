CREATE TABLE IF NOT EXISTS doctors (
  doctor_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  degree VARCHAR(120),
  specialization VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  medical_name VARCHAR(180),
  qualification VARCHAR(255),
  experience_years INT DEFAULT 0,
  consultation_fee DECIMAL(10, 2) DEFAULT 500.00,
  is_available TINYINT(1) DEFAULT 1,
  father_name VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  address VARCHAR(255),
  age INT,
  gender ENUM('Male', 'Female', 'Other'),
  role ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
  doctor_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (doctor_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS doctor_schedules (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INT DEFAULT 30,
  schedule_date DATE NULL,
  max_patients INT DEFAULT 10,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_schedule_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (doctor_id) ON DELETE CASCADE,
  UNIQUE KEY unique_doctor_day_time_date (doctor_id, day_of_week, start_time, schedule_date)
);

CREATE TABLE IF NOT EXISTS symptom_checks (
  check_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100),
  patient_age INT,
  patient_gender ENUM('Male', 'Female', 'Other'),
  symptoms TEXT NOT NULL,
  predicted_diseases TEXT,
  urgency_level ENUM('Low', 'Medium', 'High', 'Emergency') DEFAULT 'Low',
  recommended_specialist VARCHAR(100),
  ai_advice TEXT,
  check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symptom_patient_name (patient_name),
  INDEX idx_symptom_urgency (urgency_level),
  INDEX idx_symptom_date (check_date)
);

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  doctor_id INT NOT NULL,
  patient_user_id INT NULL,
  patient_name VARCHAR(120) NOT NULL,
  patient_age INT NOT NULL,
  patient_gender ENUM('Male', 'Female', 'Other'),
  patient_phone VARCHAR(30) NOT NULL,
  patient_email VARCHAR(120),
  symptoms TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'declined', 'cancelled', 'completed') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_schedule FOREIGN KEY (schedule_id) REFERENCES doctor_schedules (schedule_id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (doctor_id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_patient_user FOREIGN KEY (patient_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  INDEX idx_appointment_doctor_date (doctor_id, appointment_date),
  INDEX idx_appointment_patient_user (patient_user_id),
  UNIQUE KEY unique_schedule_slot (schedule_id, appointment_date, appointment_time)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email_enabled TINYINT(1) DEFAULT 1,
  portal_enabled TINYINT(1) DEFAULT 1,
  reminder_enabled TINYINT(1) DEFAULT 1,
  reminder_hours_before INT DEFAULT 24,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_notification_preference_user (user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  appointment_id INT NULL,
  related_entity_type VARCHAR(60) NULL,
  related_entity_id INT NULL,
  recipient_role ENUM('patient', 'doctor', 'admin') NOT NULL,
  channel ENUM('portal', 'email') NOT NULL,
  event_type ENUM('confirmation', 'reminder', 'cancellation', 'update', 'prescription', 'appointment_rescheduled') NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  email_address VARCHAR(180) NULL,
  status ENUM('pending', 'sent', 'failed', 'read', 'skipped') DEFAULT 'pending',
  scheduled_for DATETIME NULL,
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  metadata JSON NULL,
  dedupe_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (appointment_id) ON DELETE CASCADE,
  UNIQUE KEY unique_notification_dedupe_key (dedupe_key),
  INDEX idx_notifications_user_channel_status (user_id, channel, status),
  INDEX idx_notifications_scheduled (status, scheduled_for),
  INDEX idx_notifications_appointment (appointment_id),
  INDEX idx_notifications_related_entity (related_entity_type, related_entity_id)
);
