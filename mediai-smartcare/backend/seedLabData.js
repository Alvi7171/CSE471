/**
 * Seed Lab Test Data Script
 * Purpose: Generate sample lab test data for demonstration
 */

require("dotenv").config();
const { db } = require("./config/database");

const seedLabData = async () => {
  try {
    console.log("🌱 Starting lab test data seeding...\n");

    // Get existing patients and doctors
    const patients = db.prepare("SELECT patient_id FROM patients LIMIT 5").all();
    const doctors = db.prepare("SELECT doctor_id FROM doctors LIMIT 3").all();

    if (patients.length === 0) {
      console.log("❌ No patients found. Please run initDatabase first.");
      return;
    }

    if (doctors.length === 0) {
      console.log("❌ No doctors found. Please run seedAnalyticsData first.");
      return;
    }

    // Clear existing lab data
    console.log("Clearing existing lab data...");
    db.exec("DELETE FROM lab_results");
    db.exec("DELETE FROM lab_reports");
    db.exec("DELETE FROM lab_tests");

    // Insert sample lab tests
    console.log("Inserting lab tests...");
    const labTests = [
      {
        patient_id: patients[0].patient_id,
        doctor_id: doctors[0].doctor_id,
        test_type: "Blood Test",
        test_name: "Complete Blood Count (CBC)",
        priority: "Normal",
        status: "Completed",
        request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completed_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        cost: 800,
      },
      {
        patient_id: patients[1]?.patient_id || patients[0].patient_id,
        doctor_id: doctors[1]?.doctor_id || doctors[0].doctor_id,
        test_type: "Blood Test",
        test_name: "Lipid Profile",
        priority: "Normal",
        status: "Completed",
        request_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        completed_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        cost: 1200,
      },
      {
        patient_id: patients[2]?.patient_id || patients[0].patient_id,
        doctor_id: doctors[0].doctor_id,
        test_type: "Urine Test",
        test_name: "Urinalysis",
        priority: "Normal",
        status: "In Progress",
        request_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        cost: 500,
      },
      {
        patient_id: patients[3]?.patient_id || patients[0].patient_id,
        doctor_id: doctors[1]?.doctor_id || doctors[0].doctor_id,
        test_type: "X-Ray",
        test_name: "Chest X-Ray",
        priority: "Urgent",
        status: "Sample Collected",
        request_date: new Date().toISOString(),
        cost: 600,
      },
      {
        patient_id: patients[4]?.patient_id || patients[0].patient_id,
        doctor_id: doctors[2]?.doctor_id || doctors[0].doctor_id,
        test_type: "ECG",
        test_name: "Electrocardiogram",
        priority: "Emergency",
        status: "Pending",
        request_date: new Date().toISOString(),
        notes: "Patient complained of chest pain",
        cost: 1000,
      },
      {
        patient_id: patients[0].patient_id,
        doctor_id: doctors[0].doctor_id,
        test_type: "Blood Test",
        test_name: "Liver Function Test",
        priority: "Normal",
        status: "Completed",
        request_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        completed_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        cost: 1500,
      },
      {
        patient_id: patients[1]?.patient_id || patients[0].patient_id,
        doctor_id: doctors[1]?.doctor_id || doctors[0].doctor_id,
        test_type: "MRI",
        test_name: "Brain MRI",
        priority: "Urgent",
        status: "In Progress",
        request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        cost: 8000,
      },
    ];

    const insertTest = db.prepare(`
      INSERT INTO lab_tests (patient_id, doctor_id, test_type, test_name, priority, status, request_date, completed_date, cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const testIds = [];
    for (const test of labTests) {
      const result = insertTest.run(
        test.patient_id, test.doctor_id, test.test_type, test.test_name,
        test.priority, test.status, test.request_date, test.completed_date || null,
        test.cost, test.notes || null
      );
      testIds.push(result.lastInsertRowid);
      console.log(`  ✅ Created test: ${test.test_name}`);
    }

    // Add results for completed tests
    console.log("\n📊 Adding lab results...");
    const resultsData = {
      "Complete Blood Count (CBC)": [
        { parameter: "Hemoglobin", value: "14.5", unit: "g/dL", range: "12-16", abnormal: 0 },
        { parameter: "WBC", value: "7500", unit: "/μL", range: "4000-11000", abnormal: 0 },
        { parameter: "RBC", value: "4.8", unit: "million/μL", range: "4-5.5", abnormal: 0 },
        { parameter: "Platelets", value: "250000", unit: "/μL", range: "150000-400000", abnormal: 0 },
        { parameter: "Hematocrit", value: "42", unit: "%", range: "36-48", abnormal: 0 },
      ],
      "Lipid Profile": [
        { parameter: "Total Cholesterol", value: "210", unit: "mg/dL", range: "<200", abnormal: 1, level: "High" },
        { parameter: "LDL Cholesterol", value: "130", unit: "mg/dL", range: "<100", abnormal: 1, level: "High" },
        { parameter: "HDL Cholesterol", value: "55", unit: "mg/dL", range: ">40", abnormal: 0 },
        { parameter: "Triglycerides", value: "120", unit: "mg/dL", range: "<150", abnormal: 0 },
      ],
      "Liver Function Test": [
        { parameter: "ALT", value: "35", unit: "U/L", range: "7-56", abnormal: 0 },
        { parameter: "AST", value: "28", unit: "U/L", range: "10-40", abnormal: 0 },
        { parameter: "Bilirubin", value: "1.0", unit: "mg/dL", range: "0.1-1.2", abnormal: 0 },
        { parameter: "Albumin", value: "4.5", unit: "g/dL", range: "3.5-5.5", abnormal: 0 },
      ],
    };

    const insertResult = db.prepare(`
      INSERT INTO lab_results (test_id, parameter_name, value, unit, reference_range, is_abnormal, abnormality_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [testName, results] of Object.entries(resultsData)) {
      const test = labTests.find(t => t.test_name === testName);
      if (test && test.status === "Completed") {
        const testId = testIds[labTests.indexOf(test)];
        for (const r of results) {
          insertResult.run(testId, r.parameter, r.value, r.unit, r.range, r.abnormal, r.level || null);
        }
        console.log(`  ✅ Added ${results.length} results for ${testName}`);
      }
    }

    // Generate reports for completed tests
    console.log("\n📄 Generating lab reports...");
    const insertReport = db.prepare(`
      INSERT INTO lab_reports (test_id, report_type, report_date, lab_technician, summary, interpretation, is_delivered, delivered_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const completedTests = [
      { id: testIds[0], name: "Complete Blood Count (CBC)" },
      { id: testIds[1], name: "Lipid Profile" },
      { id: testIds[5], name: "Liver Function Test" },
    ];

    for (const test of completedTests) {
      insertReport.run(
        test.id,
        test.name,
        new Date().toISOString(),
        "Lab Technician - Md. Rahman",
        `Test completed successfully. ${test.name} analysis done.`,
        "All values within normal range except as noted.",
        1,
        "Patient"
      );
      console.log(`  ✅ Generated report for ${test.name} (Delivered)`);
    }

    console.log("\n✅ Lab test data seeding completed!");
    console.log(`   - ${labTests.length} lab tests created`);
    console.log(`   - Reports generated for completed tests`);
    console.log(`   - Sample results added for demonstration`);

  } catch (error) {
    console.error("❌ Error seeding lab data:", error.message);
  }
};

seedLabData();