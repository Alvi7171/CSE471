const { query } = require('./config/database');

async function test() {
    const patientId = "01712345678"; // Example phone
    try {
        if (patientId.length > 8 && !isNaN(patientId)) {
             console.log("Detected as phone number");
             const rows = await query("SELECT * FROM patients WHERE phone_number = ?", [patientId]);
             console.log("Result:", rows[0] || "Not found");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

test();
