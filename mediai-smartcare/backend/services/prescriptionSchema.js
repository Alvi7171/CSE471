const { query, engine } = require("../config/database");

let ensurePromise = null;

const runStatements = async (statements) => {
  for (const statement of statements) {
    await query(statement);
  }
};

const sqliteStatements = [
  `
  CREATE TABLE IF NOT EXISTS prescription_records (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_number TEXT NOT NULL UNIQUE,
    patient_user_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_id INTEGER,
    visit_id INTEGER,
    diagnosis TEXT,
    notes TEXT,
    advice TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS prescription_items (
    prescription_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER NOT NULL,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prescription_id) REFERENCES prescription_records(prescription_id) ON DELETE CASCADE
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_user
  ON prescription_records(patient_user_id)
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor
  ON prescription_records(doctor_id)
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription
  ON prescription_items(prescription_id)
  `,
];

const mysqlStatements = [
  `
  CREATE TABLE IF NOT EXISTS prescription_records (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_number VARCHAR(60) NOT NULL UNIQUE,
    patient_user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_id INT NULL,
    visit_id INT NULL,
    diagnosis TEXT,
    notes TEXT,
    advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescription_patient_user FOREIGN KEY (patient_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_prescription_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    CONSTRAINT fk_prescription_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    INDEX idx_prescriptions_patient_user (patient_user_id),
    INDEX idx_prescriptions_doctor (doctor_id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS prescription_items (
    prescription_item_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_name VARCHAR(180) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(120) NOT NULL,
    duration VARCHAR(120) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescription_items_header FOREIGN KEY (prescription_id) REFERENCES prescription_records(prescription_id) ON DELETE CASCADE,
    INDEX idx_prescription_items_prescription (prescription_id)
  )
  `,
];

const ensurePrescriptionSchema = async () => {
  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = (async () => {
    if (engine === "sqlite") {
      await runStatements(sqliteStatements);
      return;
    }

    await runStatements(mysqlStatements);
  })().catch((error) => {
    ensurePromise = null;
    throw error;
  });

  return ensurePromise;
};

module.exports = {
  ensurePrescriptionSchema,
};
