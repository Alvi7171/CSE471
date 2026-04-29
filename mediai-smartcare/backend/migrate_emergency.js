const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'mediai_smartcare.db'));

try {
    db.transaction(() => {
        console.log("Starting migration...");
        
        // 1. Rename old table
        db.prepare("ALTER TABLE emergency_cases RENAME TO emergency_cases_old").run();
        
        // 2. Create new table with updated CHECK constraint
        db.prepare(`
            CREATE TABLE emergency_cases (
                emergency_id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER,
                patient_name TEXT NOT NULL,
                patient_phone TEXT,
                patient_age INTEGER,
                patient_gender TEXT,
                emergency_type TEXT NOT NULL,
                severity TEXT NOT NULL CHECK(severity IN ('Critical', 'High', 'Medium', 'Low')),
                triage_category TEXT CHECK(triage_category IN ('Resuscitation', 'Emergency', 'Urgent', 'Less Urgent')),
                arrival_time TEXT NOT NULL,
                status TEXT DEFAULT 'Active' CHECK(status IN ('Reported', 'Active', 'In Treatment', 'Admitted', 'Discharged', 'Transferred', 'Deceased')),
                location TEXT,
                chief_complaint TEXT,
                vital_signs TEXT,
                initial_assessment TEXT,
                assigned_doctor_id INTEGER,
                assigned_nurse_id INTEGER,
                treatment_given TEXT,
                outcome TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        
        // 3. Copy data
        db.prepare(`
            INSERT INTO emergency_cases (
                emergency_id, patient_id, patient_name, patient_phone, patient_age, patient_gender,
                emergency_type, severity, triage_category, arrival_time, status,
                location, chief_complaint, vital_signs, initial_assessment,
                assigned_doctor_id, assigned_nurse_id, treatment_given, outcome, notes,
                created_at, updated_at
            )
            SELECT 
                emergency_id, patient_id, patient_name, patient_phone, patient_age, patient_gender,
                emergency_type, severity, triage_category, arrival_time, status,
                location, chief_complaint, vital_signs, initial_assessment,
                assigned_doctor_id, assigned_nurse_id, treatment_given, outcome, notes,
                created_at, updated_at
            FROM emergency_cases_old
        `).run();
        
        // 4. Drop old table
        db.prepare("DROP TABLE emergency_cases_old").run();
        
        console.log("Migration completed successfully!");
    })();
} catch (e) {
    console.error("Migration failed:", e.message);
} finally {
    db.close();
}
