// SQLite Database Configuration - No Cloud Setup Needed!
const Database = require('better-sqlite3');
const path = require('path');

// Create database file in backend folder
const dbPath = path.join(__dirname, '..', 'mediai_smartcare.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('✅ Connected to SQLite database:', dbPath);

// Test connection
const testConnection = () => {
  try {
    db.prepare('SELECT 1').run();
    console.log('✅ Database is working perfectly!');
    return true;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return false;
  }
};

module.exports = { db, testConnection };
