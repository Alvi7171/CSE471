/**
 * Script to add Bengali doctor names and schedules
 * CSE471 Lab Assignment 3
 * Student: MD Shafiur Rahman Alvi (23201355)
 */

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "mediai_smartcare.db");
const db = new Database(dbPath);

console.log("🇧🇩 Adding Bengali Doctors and Schedules...\n");

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Clear existing data (optional - comment out if you want to keep existing data)
// db.prepare('DELETE FROM doctor_schedules').run();
// db.prepare('DELETE FROM doctors').run();
// console.log('✅ Cleared existing data\n');

// Bengali doctors data
const bengaliDoctors = [
  {
    name: "ডাঃ রহিম উদ্দিন চৌধুরী (Dr. Rahim Uddin Chowdhury)",
    email: "dr.rahim.chowdhury@mediai.com",
    phone: "+880 1711-123456",
    specialization: "Cardiologist",
    department: "Cardiology",
    qualification: "MBBS, MD (Cardiology), FCPS",
    experience_years: 15,
    consultation_fee: 1500.0,
  },
  {
    name: "ডাঃ নাসরীন সুলতানা (Dr. Nasrin Sultana)",
    email: "dr.nasrin.sultana@mediai.com",
    phone: "+880 1712-234567",
    specialization: "Gynecologist",
    department: "Obstetrics & Gynecology",
    qualification: "MBBS, FCPS (Gynecology & Obstetrics)",
    experience_years: 12,
    consultation_fee: 1200.0,
  },
  {
    name: "ডাঃ কামরুল ইসলাম (Dr. Kamrul Islam)",
    email: "dr.kamrul.islam@mediai.com",
    phone: "+880 1713-345678",
    specialization: "Orthopedic Surgeon",
    department: "Orthopedics",
    qualification: "MBBS, MS (Orthopedics)",
    experience_years: 10,
    consultation_fee: 1300.0,
  },
  {
    name: "ডাঃ শাহনাজ পারভীন (Dr. Shahnaz Parvin)",
    email: "dr.shahnaz.parvin@mediai.com",
    phone: "+880 1714-456789",
    specialization: "Pediatrician",
    department: "Pediatrics",
    qualification: "MBBS, DCH, FCPS (Pediatrics)",
    experience_years: 8,
    consultation_fee: 900.0,
  },
  {
    name: "ডাঃ তারেক আজিজ খান (Dr. Tarek Aziz Khan)",
    email: "dr.tarek.khan@mediai.com",
    phone: "+880 1715-567890",
    specialization: "Neurologist",
    department: "Neurology",
    qualification: "MBBS, MD (Neurology)",
    experience_years: 14,
    consultation_fee: 1600.0,
  },
  {
    name: "ডাঃ ফাতেমা বেগম (Dr. Fatema Begum)",
    email: "dr.fatema.begum@mediai.com",
    phone: "+880 1716-678901",
    specialization: "Dermatologist",
    department: "Dermatology",
    qualification: "MBBS, DDV, FCPS (Dermatology)",
    experience_years: 9,
    consultation_fee: 1000.0,
  },
  {
    name: "ডাঃ হাসান মাহমুদ (Dr. Hasan Mahmud)",
    email: "dr.hasan.mahmud@mediai.com",
    phone: "+880 1717-789012",
    specialization: "General Physician",
    department: "General Medicine",
    qualification: "MBBS, FCPS (Medicine)",
    experience_years: 20,
    consultation_fee: 600.0,
  },
  {
    name: "ডাঃ রুমানা আক্তার (Dr. Rumana Akter)",
    email: "dr.rumana.akter@mediai.com",
    phone: "+880 1718-890123",
    specialization: "Psychiatrist",
    department: "Psychiatry",
    qualification: "MBBS, FCPS (Psychiatry)",
    experience_years: 7,
    consultation_fee: 1100.0,
  },
  {
    name: "ডাঃ শফিক হোসেন (Dr. Shafiq Hossain)",
    email: "dr.shafiq.hossain@mediai.com",
    phone: "+880 1719-901234",
    specialization: "ENT Specialist",
    department: "Otolaryngology",
    qualification: "MBBS, FCPS (ENT)",
    experience_years: 11,
    consultation_fee: 1000.0,
  },
  {
    name: "ডাঃ সাবিনা ইয়াসমিন (Dr. Sabina Yasmin)",
    email: "dr.sabina.yasmin@mediai.com",
    phone: "+880 1720-012345",
    specialization: "Ophthalmologist",
    department: "Ophthalmology",
    qualification: "MBBS, DO, FCPS (Ophthalmology)",
    experience_years: 13,
    consultation_fee: 1200.0,
  },
];

// Insert Bengali doctors
const insertDoctor = db.prepare(`
  INSERT INTO doctors (name, email, phone, specialization, department, qualification, experience_years, consultation_fee)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertedDoctorIds = [];

bengaliDoctors.forEach((doctor, index) => {
  try {
    const result = insertDoctor.run(
      doctor.name,
      doctor.email,
      doctor.phone,
      doctor.specialization,
      doctor.department,
      doctor.qualification,
      doctor.experience_years,
      doctor.consultation_fee,
    );
    insertedDoctorIds.push(result.lastInsertRowid);
    console.log(`✅ Added: ${doctor.name}`);
    console.log(`   Specialization: ${doctor.specialization}`);
    console.log(`   Fee: ৳${doctor.consultation_fee}`);
    console.log(`   Doctor ID: ${result.lastInsertRowid}\n`);
  } catch (error) {
    console.log(`❌ Error adding ${doctor.name}: ${error.message}\n`);
  }
});

// Bengali schedule data (variety of schedules)
const scheduleTemplates = [
  // Dr. Rahim (Cardiologist) - Limited availability
  {
    doctorIndex: 0,
    schedules: [
      { day: "Monday", start: "09:00:00", end: "13:00:00", duration: 30 },
      { day: "Wednesday", start: "09:00:00", end: "13:00:00", duration: 30 },
      { day: "Saturday", start: "14:00:00", end: "18:00:00", duration: 30 },
    ],
  },
  // Dr. Nasrin (Gynecologist) - Morning shifts
  {
    doctorIndex: 1,
    schedules: [
      { day: "Sunday", start: "08:00:00", end: "12:00:00", duration: 25 },
      { day: "Tuesday", start: "08:00:00", end: "12:00:00", duration: 25 },
      { day: "Thursday", start: "08:00:00", end: "12:00:00", duration: 25 },
    ],
  },
  // Dr. Kamrul (Orthopedic) - Afternoon shifts
  {
    doctorIndex: 2,
    schedules: [
      { day: "Monday", start: "14:00:00", end: "18:00:00", duration: 30 },
      { day: "Wednesday", start: "14:00:00", end: "18:00:00", duration: 30 },
      { day: "Friday", start: "14:00:00", end: "18:00:00", duration: 30 },
    ],
  },
  // Dr. Shahnaz (Pediatrician) - Every day except Friday
  {
    doctorIndex: 3,
    schedules: [
      { day: "Saturday", start: "10:00:00", end: "14:00:00", duration: 20 },
      { day: "Sunday", start: "10:00:00", end: "14:00:00", duration: 20 },
      { day: "Monday", start: "10:00:00", end: "14:00:00", duration: 20 },
      { day: "Tuesday", start: "10:00:00", end: "14:00:00", duration: 20 },
      { day: "Wednesday", start: "10:00:00", end: "14:00:00", duration: 20 },
      { day: "Thursday", start: "10:00:00", end: "14:00:00", duration: 20 },
    ],
  },
  // Dr. Tarek (Neurologist) - Selective days, longer duration
  {
    doctorIndex: 4,
    schedules: [
      { day: "Tuesday", start: "09:00:00", end: "13:00:00", duration: 45 },
      { day: "Thursday", start: "09:00:00", end: "13:00:00", duration: 45 },
      { day: "Saturday", start: "15:00:00", end: "19:00:00", duration: 45 },
    ],
  },
  // Dr. Fatema (Dermatologist) - Split shifts
  {
    doctorIndex: 5,
    schedules: [
      { day: "Sunday", start: "10:00:00", end: "13:00:00", duration: 25 },
      { day: "Sunday", start: "16:00:00", end: "19:00:00", duration: 25 },
      { day: "Tuesday", start: "10:00:00", end: "13:00:00", duration: 25 },
      { day: "Thursday", start: "16:00:00", end: "19:00:00", duration: 25 },
    ],
  },
  // Dr. Hasan (General) - Most available, short slots
  {
    doctorIndex: 6,
    schedules: [
      { day: "Saturday", start: "08:00:00", end: "14:00:00", duration: 15 },
      { day: "Sunday", start: "08:00:00", end: "14:00:00", duration: 15 },
      { day: "Monday", start: "08:00:00", end: "14:00:00", duration: 15 },
      { day: "Tuesday", start: "08:00:00", end: "14:00:00", duration: 15 },
      { day: "Wednesday", start: "08:00:00", end: "14:00:00", duration: 15 },
    ],
  },
  // Dr. Rumana (Psychiatrist) - Evening sessions
  {
    doctorIndex: 7,
    schedules: [
      { day: "Monday", start: "16:00:00", end: "20:00:00", duration: 60 },
      { day: "Wednesday", start: "16:00:00", end: "20:00:00", duration: 60 },
      { day: "Friday", start: "16:00:00", end: "20:00:00", duration: 60 },
    ],
  },
  // Dr. Shafiq (ENT) - Regular weekday schedule
  {
    doctorIndex: 8,
    schedules: [
      { day: "Sunday", start: "11:00:00", end: "15:00:00", duration: 30 },
      { day: "Tuesday", start: "11:00:00", end: "15:00:00", duration: 30 },
      { day: "Thursday", start: "11:00:00", end: "15:00:00", duration: 30 },
    ],
  },
  // Dr. Sabina (Ophthalmologist) - Morning + Afternoon
  {
    doctorIndex: 9,
    schedules: [
      { day: "Monday", start: "09:00:00", end: "12:00:00", duration: 25 },
      { day: "Monday", start: "15:00:00", end: "18:00:00", duration: 25 },
      { day: "Wednesday", start: "09:00:00", end: "12:00:00", duration: 25 },
      { day: "Friday", start: "15:00:00", end: "18:00:00", duration: 25 },
    ],
  },
];

console.log("📅 Adding Bengali Doctor Schedules...\n");

const insertSchedule = db.prepare(`
  INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration)
  VALUES (?, ?, ?, ?, ?)
`);

let totalSchedules = 0;

scheduleTemplates.forEach((template) => {
  const doctorId = insertedDoctorIds[template.doctorIndex];
  const doctorName = bengaliDoctors[template.doctorIndex].name;

  console.log(`📋 Schedules for ${doctorName.split("(")[0].trim()}:`);

  template.schedules.forEach((schedule) => {
    try {
      insertSchedule.run(
        doctorId,
        schedule.day,
        schedule.start,
        schedule.end,
        schedule.duration,
      );
      console.log(
        `   ✅ ${schedule.day}: ${schedule.start.slice(0, 5)} - ${schedule.end.slice(0, 5)} (${schedule.duration} min slots)`,
      );
      totalSchedules++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  });
  console.log("");
});

// Summary statistics
console.log("\n📊 SUMMARY STATISTICS\n");
console.log("═".repeat(50));

const totalDoctors = db
  .prepare("SELECT COUNT(*) as count FROM doctors")
  .get().count;
const totalSchedulesCount = db
  .prepare("SELECT COUNT(*) as count FROM doctor_schedules")
  .get().count;

console.log(`Total Doctors in Database: ${totalDoctors}`);
console.log(`Total Schedules in Database: ${totalSchedulesCount}`);
console.log(`Bengali Doctors Added: ${insertedDoctorIds.length}`);
console.log(`Bengali Schedules Added: ${totalSchedules}`);
console.log("═".repeat(50));

// Display all Bengali doctors with their specializations
console.log("\n👨‍⚕️ ALL BENGALI DOCTORS\n");

bengaliDoctors.forEach((doc, i) => {
  console.log(`${i + 1}. ${doc.name}`);
  console.log(`   📧 ${doc.email}`);
  console.log(`   🏥 ${doc.specialization} (${doc.department})`);
  console.log(`   💰 Consultation Fee: ৳${doc.consultation_fee}`);
  console.log("");
});

// Show schedule distribution by day
console.log("\n📅 SCHEDULE DISTRIBUTION BY DAY\n");

const dayStats = db
  .prepare(
    `
  SELECT day_of_week, COUNT(*) as count
  FROM doctor_schedules
  GROUP BY day_of_week
  ORDER BY 
    CASE day_of_week
      WHEN 'Saturday' THEN 1
      WHEN 'Sunday' THEN 2
      WHEN 'Monday' THEN 3
      WHEN 'Tuesday' THEN 4
      WHEN 'Wednesday' THEN 5
      WHEN 'Thursday' THEN 6
      WHEN 'Friday' THEN 7
    END
`,
  )
  .all();

dayStats.forEach((stat) => {
  const bar = "█".repeat(stat.count);
  console.log(`${stat.day_of_week.padEnd(10)} ${bar} (${stat.count})`);
});

db.close();

console.log("\n✅ Bengali data added successfully!\n");
console.log("💡 TIP: Restart your backend server to see the new data.");
console.log("   Run: cd backend && npm start\n");
