const { query } = require("./config/database");

async function check() {
  try {
    const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables:", tables);
    
    for (const table of tables) {
      if (table.name === 'users') {
        const users = await query("SELECT user_id, email, phone, role FROM users");
        console.log("Users:", users);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
