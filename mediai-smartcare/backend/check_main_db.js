const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'mediai_smartcare.db'));

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("TABLES:", tables.map(t => t.name).join(', '));
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='emergency_cases'").get();
    if (schema) {
        console.log("SCHEMA_START");
        console.log(schema.sql);
        console.log("SCHEMA_END");
    } else {
        console.log("emergency_cases table not found in mediai_smartcare.db");
    }
} catch (e) {
    console.error(e);
}
db.close();
