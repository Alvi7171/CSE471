/**
 * Seed Analytics Data Script
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 * Purpose: Generate sample data for analytics dashboard demonstration
 */

require("dotenv").config();
const { db } = require("./config/database");

const seedAnalyticsData = async () => {
  try {
    console.log("🌱 Starting analytics data seeding...\n");

    // Clear existing data
    console.log("Clearing existing data...");
    db.exec("DELETE FROM appointments");
    db.exec("DELETE FROM doctor_schedules");
    db.exec("DELETE FROM doctors");
    db.exec("DELETE FROM users WHERE role = 'patient'");

    // Insert doctors
    console.log("Inserting doctors...");
    const doctors = [
      {
        name: "Dr. Ahmed Hassan",
        email: "ahmed@mediai.com",
        phone: "+8801711111111",
        degree: "MBBS, MD",
        specialization: "Cardiology",
        department: "Cardiology",
        medical_name: "Ahmed Hassan",
        qualification: "MBBS (Dhaka University), MD (Cardiology)",
        experience_years: 12,
        consultation_fee: 1500,
        is_available: 1,
      },
      {
        name: "Dr. Fatima Khan",
        email: "fatima@mediai.com",
        phone: "+8801722222222",
        degree: "MBBS, MD",
        specialization: "Neurology",
        department: "Neurology",
        medical_name: "Fatima Khan",
        qualification: "MBBS (BSMMU), MD (Neurology)",
        experience_years: 10,
        consultation_fee: 1200,
        is_available: 1,
      },
      {
        name: "Dr. Rajesh Kumar",
        email: "rajesh@mediai.com",
        phone: "+8801733333333",
        degree: "MBBS, MS",
        specialization: "General Surgery",
        department: "Surgery",
        medical_name: "Rajesh Kumar",
        qualification: "MBBS (India), MS (General Surgery)",
        experience_years: 15,
        consultation_fee: 2000,
        is_available: 1,
      },
      {
        name: "Dr. Sarah Ahmed",
        email: "sarah@mediai.com",
        phone: "+8801744444444",
        degree: "MBBS, FCPS",
        specialization: "Pediatrics",
        department: "Pediatrics",
        medical_name: "Sarah Ahmed",
        qualification: "MBBS (DMC), FCPS (Pediatrics)",
        experience_years: 8,
        consultation_fee: 1000,
        is_available: 1,
      },
      {
        name: "Dr. Mohammad Ali",
        email: "ali@mediai.com",
        phone: "+8801755555555",
        degree: "MBBS, FCPS",
        specialization: "Internal Medicine",
        department: "Internal Medicine",
        medical_name: "Mohammad Ali",
        qualification: "MBBS (BUHS), FCPS (Medicine)",
        experience_years: 9,
        consultation_fee: 900,
        is_available: 1,
      },
    ];

    const doctorIds = [];
    for (const doc of doctors) {
      const stmt = db.prepare(`
        INSERT INTO doctors (
          name, email, phone, degree, specialization, department,
          medical_name, qualification, experience_years, consultation_fee, is_available
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        doc.name,
        doc.email,
        doc.phone,
        doc.degree,
        doc.specialization,
        doc.department,
        doc.medical_name,
        doc.qualification,
        doc.experience_years,
        doc.consultation_fee,
        doc.is_available,
      );
      doctorIds.push(result.lastInsertRowid);
      console.log(`✓ Added Dr. ${doc.name}`);
    }

    // Insert patients
    console.log("\nInserting patients...");
    const patients = [
      {
        full_name: "Md. Habib Rahman",
        email: "habib@email.com",
        phone: "+8801911111111",
        address: "Dhaka",
        age: 35,
        gender: "Male",
      },
      {
        full_name: "Zainab Fatima",
        email: "zainab@email.com",
        phone: "+8801922222222",
        address: "Dhaka",
        age: 28,
        gender: "Female",
      },
      {
        full_name: "Karim Ahmed",
        email: "karim@email.com",
        phone: "+8801933333333",
        address: "Chittagong",
        age: 45,
        gender: "Male",
      },
      {
        full_name: "Nasrin Akter",
        email: "nasrin@email.com",
        phone: "+8801944444444",
        address: "Dhaka",
        age: 32,
        gender: "Female",
      },
      {
        full_name: "Sohan Chowdhury",
        email: "sohan@email.com",
        phone: "+8801955555555",
        address: "Sylhet",
        age: 50,
        gender: "Male",
      },
      {
        full_name: "Aisha Khan",
        email: "aisha@email.com",
        phone: "+8801966666666",
        address: "Dhaka",
        age: 25,
        gender: "Female",
      },
      {
        full_name: "Harun Islam",
        email: "harun@email.com",
        phone: "+8801977777777",
        address: "Khulna",
        age: 55,
        gender: "Male",
      },
      {
        full_name: "Sohana Begum",
        email: "sohana@email.com",
        phone: "+8801988888888",
        address: "Dhaka",
        age: 40,
        gender: "Female",
      },
    ];

    const bcrypt = require("bcryptjs");
    const passwordHash = bcrypt.hashSync("Patient@123", 10);

    const patientIds = [];
    for (const patient of patients) {
      const stmt = db.prepare(`
        INSERT INTO users (
          full_name, email, password_hash, phone, address, age, gender, role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'patient')
      `);
      const result = stmt.run(
        patient.full_name,
        patient.email,
        passwordHash,
        patient.phone,
        patient.address,
        patient.age,
        patient.gender,
      );
      patientIds.push(result.lastInsertRowid);
      console.log(`✓ Added patient ${patient.full_name}`);
    }

    // Insert doctor schedules
    console.log("\nInserting doctor schedules...");
    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const scheduleIds = [];
    for (let i = 0; i < doctorIds.length; i++) {
      for (const day of daysOfWeek) {
        const stmt = db.prepare(`
          INSERT INTO doctor_schedules (
            doctor_id, day_of_week, start_time, end_time, slot_duration,
            max_patients, is_active
          ) VALUES (?, ?, ?, ?, 30, 10, 1)
        `);
        const result = stmt.run(doctorIds[i], day, "09:00:00", "17:00:00");
        scheduleIds.push(result.lastInsertRowid);
      }
    }
    console.log(`✓ Added schedules for all doctors`);

    // Insert appointments with realistic dates
    console.log("\nInserting appointments...");
    const today = new Date();
    let appointmentCount = 0;

    const symptoms = [
      "Chest pain, shortness of breath",
      "Headache, fever",
      "Stomach pain, nausea",
      "Dizziness, fatigue",
      "Cough, sore throat",
    ];

    for (let i = 0; i < patientIds.length; i++) {
      // Each patient has multiple appointments over past 30 days
      for (let j = 0; j < 3; j++) {
        const appointmentDate = new Date(
          today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        );
        const doctorId = doctorIds[Math.floor(Math.random() * doctorIds.length)];
        const scheduleId = scheduleIds[Math.floor(Math.random() * scheduleIds.length)];

        const stmt = db.prepare(`
          INSERT INTO appointments (
            schedule_id, doctor_id, patient_user_id, patient_name, patient_age, 
            patient_gender, patient_phone, patient_email, symptoms, 
            appointment_date, appointment_time, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `);

        const patient = patients[i];
        const time = `${String(Math.floor(Math.random() * 8) + 9).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`;

        stmt.run(
          scheduleId,
          doctorId,
          patientIds[i],
          patient.full_name,
          patient.age,
          patient.gender,
          patient.phone,
          patient.email,
          symptoms[Math.floor(Math.random() * symptoms.length)],
          appointmentDate.toISOString().split("T")[0],
          time,
        );
        appointmentCount++;
      }
    }
    console.log(`✓ Added ${appointmentCount} appointments`);

    console.log("\n✅ Analytics data seeding completed successfully!\n");
    console.log("Summary:");
    console.log(`  • Doctors: ${doctorIds.length}`);
    console.log(`  • Patients: ${patientIds.length}`);
    console.log(`  • Appointments: ${appointmentCount}`);
    console.log("\nYour analytics dashboard should now show:");
    console.log("  ✓ Total patient visits");
    console.log("  ✓ Department performance");
    console.log("  ✓ Doctor workload");
    console.log("  ✓ Revenue statistics");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
};

seedAnalyticsData();
