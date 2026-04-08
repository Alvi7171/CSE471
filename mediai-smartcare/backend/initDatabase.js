// Initialize SQLite Database with Tables and Sample Data
const { db } = require("./config/database");

console.log("🔧 Initializing database...\n");

try {
  // Create doctors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      specialization TEXT NOT NULL,
      department TEXT NOT NULL,
      qualification TEXT,
      experience_years INTEGER DEFAULT 0,
      consultation_fee REAL DEFAULT 500.00,
      is_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Created doctors table");

  // Create doctor_schedules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_duration INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
      UNIQUE (doctor_id, day_of_week, start_time)
    );
  `);
  console.log("✅ Created doctor_schedules table");

  // Create symptom_checks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS symptom_checks (
      check_id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT,
      patient_age INTEGER,
      patient_gender TEXT CHECK(patient_gender IN ('Male', 'Female', 'Other')),
      symptoms TEXT NOT NULL,
      predicted_diseases TEXT,
      urgency_level TEXT DEFAULT 'Low' CHECK(urgency_level IN ('Low', 'Medium', 'High', 'Emergency')),
      recommended_specialist TEXT,
      ai_advice TEXT,
      check_date TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Created symptom_checks table");

  // Create time_slots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_slots (
      slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      schedule_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_booked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
      UNIQUE (doctor_id, schedule_date, start_time)
    );
  `);
  console.log("✅ Created time_slots table");

  // Insert sample doctors
  const insertDoctor = db.prepare(`
    INSERT OR IGNORE INTO doctors (name, email, phone, specialization, department, qualification, experience_years, consultation_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const doctors = [
    [
      "Dr. Sarah Ahmed",
      "sarah.ahmed@mediai.com",
      "+8801712345678",
      "Cardiologist",
      "Cardiology",
      "MBBS, MD (Cardiology)",
      12,
      1200.0,
    ],
    [
      "Dr. Kamal Hassan",
      "kamal.hassan@mediai.com",
      "+8801812345679",
      "Neurologist",
      "Neurology",
      "MBBS, MD (Neurology)",
      15,
      1500.0,
    ],
    [
      "Dr. Nadia Islam",
      "nadia.islam@mediai.com",
      "+8801912345680",
      "Pediatrician",
      "Pediatrics",
      "MBBS, DCH",
      8,
      800.0,
    ],
    [
      "Dr. Rafiq Rahman",
      "rafiq.rahman@mediai.com",
      "+8801612345681",
      "General Physician",
      "General Medicine",
      "MBBS",
      5,
      500.0,
    ],
    [
      "Dr. Farah Khan",
      "farah.khan@mediai.com",
      "+8801512345682",
      "Dermatologist",
      "Dermatology",
      "MBBS, MD (Dermatology)",
      10,
      1000.0,
    ],
  ];

  for (const doctor of doctors) {
    insertDoctor.run(doctor);
  }
  console.log("✅ Inserted 5 sample doctors");

  // Insert sample schedules
  const insertSchedule = db.prepare(`
    INSERT OR IGNORE INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration)
    VALUES (?, ?, ?, ?, ?)
  `);

  const schedules = [
    [1, "Monday", "09:00:00", "13:00:00", 30],
    [1, "Wednesday", "09:00:00", "13:00:00", 30],
    [1, "Friday", "14:00:00", "18:00:00", 30],
    [2, "Tuesday", "10:00:00", "14:00:00", 30],
    [2, "Thursday", "10:00:00", "14:00:00", 30],
    [2, "Saturday", "09:00:00", "12:00:00", 30],
    [3, "Monday", "14:00:00", "18:00:00", 20],
    [3, "Tuesday", "14:00:00", "18:00:00", 20],
    [3, "Wednesday", "14:00:00", "18:00:00", 20],
    [3, "Friday", "09:00:00", "13:00:00", 20],
    [4, "Monday", "08:00:00", "16:00:00", 15],
    [4, "Tuesday", "08:00:00", "16:00:00", 15],
    [4, "Wednesday", "08:00:00", "16:00:00", 15],
    [4, "Thursday", "08:00:00", "16:00:00", 15],
    [4, "Friday", "08:00:00", "16:00:00", 15],
    [5, "Sunday", "10:00:00", "14:00:00", 30],
    [5, "Tuesday", "15:00:00", "19:00:00", 30],
    [5, "Thursday", "15:00:00", "19:00:00", 30],
  ];

  for (const schedule of schedules) {
    insertSchedule.run(schedule);
  }
  console.log("✅ Inserted 18 doctor schedules");

  console.log("\n🎉 Database initialized successfully!");
  console.log("📊 Database location: backend/mediai_smartcare.db");
} catch (error) {
  console.error("❌ Error initializing database:", error.message);
  process.exit(1);
}
