const { query } = require('./config/database');

async function check() {
    try {
        const rows = await query("SELECT count(*) as count FROM lab_tests");
        console.log("COUNT:", rows);
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit();
}

check();
