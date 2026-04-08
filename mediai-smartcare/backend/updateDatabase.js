/**
 * Update database schema to add appointment booking functionality
 * - Add schedule_date and max_patients to doctor_schedules
 * - Create appointments table for patient bookings
 */

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "mediai_smartcare.db");
const db = new Database(dbPath);

console.log("🔧 Updating database schema...\n");

db.pragma("foreign_keys = ON");

try {
  // Add new columns to doctor_schedules table
  console.log("📅 Updating doctor_schedules table...");

  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(doctor_schedules)").all();
  const columnNames = tableInfo.map((col) => col.name);

  if (!columnNames.includes("schedule_date")) {
    db.exec(`ALTER TABLE doctor_schedules ADD COLUMN schedule_date TEXT`);
    console.log("✅ Added schedule_date column");
  } else {
    console.log("⚠️  schedule_date column already exists");
  }

  if (!columnNames.includes("max_patients")) {
    db.exec(
      `ALTER TABLE doctor_schedules ADD COLUMN max_patients INTEGER DEFAULT 10`,
    );
    console.log("✅ Added max_patients column");
  } else {
    console.log("⚠️  max_patients column already exists");
  }

  // Create appointments table
  console.log("\n📋 Creating appointments table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      patient_age INTEGER NOT NULL,
      patient_gender TEXT CHECK(patient_gender IN ('Male', 'Female', 'Other')),
      patient_phone TEXT NOT NULL,
      patient_email TEXT,
      symptoms TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(schedule_id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
    )
  `);
  console.log("✅ Created appointments table");

  // Update existing schedules to have max_patients
  console.log("\n📊 Updating existing schedules with max_patients...");
  const updateResult = db
    .prepare(
      `
    UPDATE doctor_schedules 
    SET max_patients = 10 
    WHERE max_patients IS NULL
  `,
    )
    .run();
  console.log(
    `✅ Updated ${updateResult.changes} schedules with max_patients = 10`,
  );

  // Create some date-specific schedules for testing
  console.log("\n📅 Creating date-specific schedules for testing...");

  const today = new Date();
  const schedules = [];

  // Generate schedules for next 7 days for Dr. Rahim (ID 6) and Dr. Shahnaz (ID 9)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][date.getDay()];

    // Dr. Rahim - Morning slots
    if (["Monday", "Wednesday", "Saturday"].includes(dayName)) {
      schedules.push({
        doctor_id: 6,
        day_of_week: dayName,
        start_time: "09:00:00",
        end_time: "13:00:00",
        slot_duration: 30,
        schedule_date: dateStr,
        max_patients: 8,
      });
    }

    // Dr. Shahnaz - All days except Friday
    if (dayName !== "Friday") {
      schedules.push({
        doctor_id: 9,
        day_of_week: dayName,
        start_time: "10:00:00",
        end_time: "14:00:00",
        slot_duration: 20,
        schedule_date: dateStr,
        max_patients: 12,
      });
    }
  }

  const insertSchedule = db.prepare(`
    INSERT OR IGNORE INTO doctor_schedules 
    (doctor_id, day_of_week, start_time, end_time, slot_duration, schedule_date, max_patients)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let created = 0;
  schedules.forEach((s) => {
    try {
      const result = insertSchedule.run(
        s.doctor_id,
        s.day_of_week,
        s.start_time,
        s.end_time,
        s.slot_duration,
        s.schedule_date,
        s.max_patients,
      );
      if (result.changes > 0) created++;
    } catch (err) {
      // Ignore duplicate errors
    }
  });

  console.log(`✅ Created ${created} date-specific schedules for testing`);

  // Display summary
  console.log("\n📊 DATABASE SUMMARY\n");
  console.log("═".repeat(60));

  const tables = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `,
    )
    .all();

  console.log("Tables:");
  tables.forEach((t) => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
    console.log(`  • ${t.name.padEnd(20)} ${count.count} records`);
  });

  console.log("\n✅ Database update completed successfully!\n");

  // Show sample date-specific schedules
  console.log("📅 Sample Date-Specific Schedules:\n");
  const sampleSchedules = db
    .prepare(
      `
    SELECT 
      s.schedule_id,
      d.name as doctor_name,
      s.schedule_date,
      s.day_of_week,
      s.start_time,
      s.end_time,
      s.max_patients,
      (SELECT COUNT(*) FROM appointments WHERE schedule_id = s.schedule_id) as booked_count
    FROM doctor_schedules s
    JOIN doctors d ON s.doctor_id = d.doctor_id
    WHERE s.schedule_date IS NOT NULL
    ORDER BY s.schedule_date, s.start_time
    LIMIT 10
  `,
    )
    .all();

  sampleSchedules.forEach((s) => {
    const available = s.max_patients - s.booked_count;
    console.log(
      `[${s.schedule_id}] ${s.doctor_name.substring(0, 30).padEnd(30)}`,
    );
    console.log(`    Date: ${s.schedule_date} (${s.day_of_week})`);
    console.log(
      `    Time: ${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}`,
    );
    console.log(
      `    Capacity: ${s.booked_count}/${s.max_patients} booked, ${available} available`,
    );
    console.log("");
  });
} catch (error) {
  console.error("❌ Error updating database:", error.message);
  process.exit(1);
}

db.close();

console.log("💡 Next steps:");
console.log("   1. Restart backend server: cd backend && npm start");
console.log("   2. Test new booking API endpoints");
console.log("   3. Open patient booking page in frontend\n");
