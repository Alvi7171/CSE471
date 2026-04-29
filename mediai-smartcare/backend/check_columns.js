const { query } = require('./config/database');

async function check() {
    try {
        const columns = await query("PRAGMA table_info(lab_tests)");
        console.log("COLUMNS:", columns);
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit();
}

check();
