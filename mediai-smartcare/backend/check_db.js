const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='emergency_cases'").get();
    console.log("SCHEMA_START");
    console.log(schema.sql);
    console.log("SCHEMA_END");
} catch (e) {
    console.error(e);
}
db.close();
