// Verification script for Module 1 and Module 2
const db = require('better-sqlite3')('./mediai_smartcare.db');

console.log('\n========================================');
console.log('MODULE VERIFICATION REPORT');
console.log('========================================\n');

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('✅ Database Tables Found:');
tables.forEach(t => console.log('   - ' + t.name));

// Check Module 1 - Patient Management tables
console.log('\n📋 Module 1 - Patient Management Tables:');
const patientTables = ['patients', 'medical_visits', 'diagnostic_reports', 'prescriptions', 'treatment_timeline'];
patientTables.forEach(table => {
  const exists = tables.find(t => t.name === table);
  console.log(`   ${exists ? '✅' : '❌'} ${table}`);
});

// Check Module 2 - Analytics data sources
console.log('\n📊 Module 2 - Analytics Data Sources:');
const analyticsTables = ['doctors', 'patients', 'medical_visits', 'diagnostic_reports'];
analyticsTables.forEach(table => {
  const exists = tables.find(t => t.name === table);
  console.log(`   ${exists ? '✅' : '❌'} ${table}`);
});

// Check row counts
console.log('\n📈 Data Summary:');
try {
  const doctorCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get();
  const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get();
  const visitCount = db.prepare('SELECT COUNT(*) as count FROM medical_visits').get();
  const diagnosticCount = db.prepare('SELECT COUNT(*) as count FROM diagnostic_reports').get();
  
  console.log(`   - Doctors: ${doctorCount.count}`);
  console.log(`   - Patients: ${patientCount.count}`);
  console.log(`   - Medical Visits: ${visitCount.count}`);
  console.log(`   - Diagnostic Reports: ${diagnosticCount.count}`);
} catch (e) {
  console.log('   Error fetching counts:', e.message);
}

console.log('\n✅ VERIFICATION COMPLETE');
console.log('========================================\n');
