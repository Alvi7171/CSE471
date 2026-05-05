const { db, query } = require('./config/database');

async function check() {
    try {
        const patients = await query("SELECT patient_id, first_name, last_name FROM patients LIMIT 5");
        console.log("PATIENTS:", patients);
        const doctors = await query("SELECT doctor_id, name FROM doctors LIMIT 5");
        console.log("DOCTORS:", doctors);
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit();
}

check();
