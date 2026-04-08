-- MediAI SmartCare Database Schema
-- Author: MD Shafiur Rahman Alvi (ID: 23201355)
-- Features: Doctor Scheduling & AI Symptom Checker

-- ============================================
-- TABLE 1: Doctors Table
-- ============================================
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    specialization VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    qualification VARCHAR(255),
    experience_years INT DEFAULT 0,
    consultation_fee DECIMAL(10, 2) DEFAULT 500.00,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 2: Doctor Schedule/Availability Table
-- ============================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT DEFAULT 30 COMMENT 'Duration in minutes',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_day_time (doctor_id, day_of_week, start_time)
);

-- ============================================
-- TABLE 3: Symptom Check History Table
-- ============================================
CREATE TABLE IF NOT EXISTS symptom_checks (
    check_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100),
    patient_age INT,
    patient_gender ENUM('Male', 'Female', 'Other'),
    symptoms TEXT NOT NULL COMMENT 'Comma-separated symptoms',
    predicted_diseases TEXT COMMENT 'AI predicted diseases',
    urgency_level ENUM('Low', 'Medium', 'High', 'Emergency') DEFAULT 'Low',
    recommended_specialist VARCHAR(100),
    ai_advice TEXT,
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_patient_name (patient_name),
    INDEX idx_urgency (urgency_level),
    INDEX idx_date (check_date)
);

-- ============================================
-- TABLE 4: Available Time Slots (Optional for booking prevention)
-- ============================================
CREATE TABLE IF NOT EXISTS time_slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    UNIQUE KEY unique_slot (doctor_id, schedule_date, start_time)
);

-- ============================================
-- SAMPLE DATA for Testing
-- ============================================

-- Insert Sample Doctors
INSERT INTO doctors (name, email, phone, specialization, department, qualification, experience_years, consultation_fee) VALUES
('Dr. Sarah Ahmed', 'sarah.ahmed@mediai.com', '+8801712345678', 'Cardiologist', 'Cardiology', 'MBBS, MD (Cardiology)', 12, 1200.00),
('Dr. Kamal Hassan', 'kamal.hassan@mediai.com', '+8801812345679', 'Neurologist', 'Neurology', 'MBBS, MD (Neurology)', 15, 1500.00),
('Dr. Nadia Islam', 'nadia.islam@mediai.com', '+8801912345680', 'Pediatrician', 'Pediatrics', 'MBBS, DCH', 8, 800.00),
('Dr. Rafiq Rahman', 'rafiq.rahman@mediai.com', '+8801612345681', 'General Physician', 'General Medicine', 'MBBS', 5, 500.00),
('Dr. Farah Khan', 'farah.khan@mediai.com', '+8801512345682', 'Dermatologist', 'Dermatology', 'MBBS, MD (Dermatology)', 10, 1000.00);

-- Insert Sample Doctor Schedules
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration) VALUES
-- Dr. Sarah Ahmed (Cardiologist)
(1, 'Monday', '09:00:00', '13:00:00', 30),
(1, 'Wednesday', '09:00:00', '13:00:00', 30),
(1, 'Friday', '14:00:00', '18:00:00', 30),

-- Dr. Kamal Hassan (Neurologist)
(2, 'Tuesday', '10:00:00', '14:00:00', 30),
(2, 'Thursday', '10:00:00', '14:00:00', 30),
(2, 'Saturday', '09:00:00', '12:00:00', 30),

-- Dr. Nadia Islam (Pediatrician)
(3, 'Monday', '14:00:00', '18:00:00', 20),
(3, 'Tuesday', '14:00:00', '18:00:00', 20),
(3, 'Wednesday', '14:00:00', '18:00:00', 20),
(3, 'Friday', '09:00:00', '13:00:00', 20),

-- Dr. Rafiq Rahman (General Physician)
(4, 'Monday', '08:00:00', '16:00:00', 15),
(4, 'Tuesday', '08:00:00', '16:00:00', 15),
(4, 'Wednesday', '08:00:00', '16:00:00', 15),
(4, 'Thursday', '08:00:00', '16:00:00', 15),
(4, 'Friday', '08:00:00', '16:00:00', 15),

-- Dr. Farah Khan (Dermatologist)
(5, 'Sunday', '10:00:00', '14:00:00', 30),
(5, 'Tuesday', '15:00:00', '19:00:00', 30),
(5, 'Thursday', '15:00:00', '19:00:00', 30);
