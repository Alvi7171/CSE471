-- ============================================
-- PATIENT MANAGEMENT & MEDICAL TIMELINE TABLES
-- Author: MD Shafiur Rahman Alvi (ID: 23201355)
-- Purpose: Patient registration, medical history, prescriptions, and treatment timeline
-- ============================================

-- ============================================
-- TABLE 1: Patients Registration Table
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    smart_patient_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
    blood_type TEXT CHECK(blood_type IN ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')),
    phone_number TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    national_id TEXT UNIQUE,
    allergies TEXT COMMENT 'Comma-separated allergies',
    chronic_diseases TEXT COMMENT 'Pre-existing conditions',
    current_medications TEXT COMMENT 'Current medications list',
    registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 2: Medical History/Visits Table
-- ============================================
CREATE TABLE IF NOT EXISTS medical_visits (
    visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_id INTEGER,
    visit_date TEXT NOT NULL,
    visit_reason TEXT NOT NULL,
    chief_complaint TEXT,
    vital_signs TEXT COMMENT 'JSON format: {bp, hr, temp, respiratory_rate, spo2}',
    diagnosis TEXT,
    clinical_notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
    follow_up_required BOOLEAN DEFAULT 0,
    follow_up_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
);

-- ============================================
-- TABLE 3: Diagnostic Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS diagnostic_reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    visit_id INTEGER,
    report_type TEXT NOT NULL COMMENT 'Blood Test, X-Ray, ECG, Ultrasound, etc.',
    test_name TEXT NOT NULL,
    report_date TEXT NOT NULL,
    lab_name TEXT,
    results TEXT NOT NULL COMMENT 'Detailed test results - can be JSON',
    reference_values TEXT COMMENT 'Normal/reference ranges',
    abnormalities TEXT COMMENT 'Test abnormalities found',
    urgency_level TEXT CHECK(urgency_level IN ('Normal', 'Abnormal', 'Critical')),
    file_path TEXT COMMENT 'Path to uploaded report file',
    interpretation TEXT COMMENT 'Doctor interpretation',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (visit_id) REFERENCES medical_visits(visit_id) ON DELETE SET NULL
);

-- ============================================
-- TABLE 4: Prescriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    visit_id INTEGER,
    prescription_date TEXT NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL COMMENT 'e.g., 500mg',
    frequency TEXT NOT NULL COMMENT 'e.g., Twice daily, Every 8 hours',
    duration TEXT NOT NULL COMMENT 'e.g., 7 days, 2 weeks',
    route TEXT NOT NULL CHECK(route IN ('Oral', 'Injection', 'Topical', 'Inhalation', 'Rectal')),
    instructions TEXT COMMENT 'Special instructions',
    refills_allowed INTEGER DEFAULT 0,
    refills_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    expiry_date TEXT,
    pharmacy_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (visit_id) REFERENCES medical_visits(visit_id) ON DELETE SET NULL
);

-- ============================================
-- TABLE 5: Treatment Timeline Table
-- ============================================
CREATE TABLE IF NOT EXISTS treatment_timeline (
    timeline_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER,
    treatment_date TEXT NOT NULL,
    treatment_type TEXT NOT NULL COMMENT 'Medication, Procedure, Therapy, Surgery, etc.',
    treatment_name TEXT NOT NULL,
    treatment_description TEXT,
    duration TEXT COMMENT 'e.g., 5 days, 2 weeks',
    status TEXT NOT NULL DEFAULT 'ongoing' CHECK(status IN ('scheduled', 'ongoing', 'completed', 'cancelled', 'paused')),
    outcome TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL
);

-- ============================================
-- TABLE 6: Doctor-Patient Access Control
-- ============================================
CREATE TABLE IF NOT EXISTS doctor_patient_access (
    access_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'full' CHECK(access_level IN ('view', 'edit', 'full', 'limited')),
    access_reason TEXT COMMENT 'e.g., Primary Physician, Specialist',
    is_active BOOLEAN DEFAULT 1,
    granted_date TEXT DEFAULT CURRENT_TIMESTAMP,
    revoked_date TEXT,
    UNIQUE (doctor_id, patient_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 7: Medical History Audit Log
-- ============================================
CREATE TABLE IF NOT EXISTS medical_history_audit (
    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    accessed_by_doctor_id INTEGER,
    action_type TEXT NOT NULL COMMENT 'viewed, created, modified, deleted',
    record_type TEXT NOT NULL COMMENT 'visit, report, prescription, treatment',
    record_id INTEGER,
    access_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (accessed_by_doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_patients_smart_id ON patients(smart_patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON medical_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON medical_visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON medical_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_reports_patient ON diagnostic_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON diagnostic_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_active ON prescriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_timeline_patient ON treatment_timeline(patient_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON treatment_timeline(treatment_date);
CREATE INDEX IF NOT EXISTS idx_access_doctor ON doctor_patient_access(doctor_id);
CREATE INDEX IF NOT EXISTS idx_access_patient ON doctor_patient_access(patient_id);
