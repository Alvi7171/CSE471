// Check database content
const { db } = require("./config/database");

console.log("📋 Checking database content...\n");

try {
  // Check patients
  const patients = db.prepare("SELECT * FROM patients").all();
  console.log(`✅ Total patients: ${patients.length}`);
  if (patients.length > 0) {
    console.log("\n📊 Patient data:");
    patients.forEach(p => {
      console.log(`  - ID: ${p.patient_id}, Smart ID: ${p.smart_patient_id}, Name: ${p.first_name} ${p.last_name}, Phone: ${p.phone_number}`);
    });
  } else {
    console.log("❌ No patients found in database");
  }

  // Check tables exist
  console.log("\n🔍 Checking tables...");
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all();
  console.log(`✅ Total tables: ${tables.length}`);
  tables.forEach(t => console.log(`  - ${t.name}`));

  // Check medical_visits
  const visits = db.prepare("SELECT COUNT(*) as count FROM medical_visits").get();
  console.log(`\n📅 Medical visits: ${visits.count}`);

} catch (error) {
  console.error("❌ Error:", error.message);
}
