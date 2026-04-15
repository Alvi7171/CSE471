const mysql = require("mysql2/promise");

const getDbConfig = () => {
  const connectionUrl =
    process.env.DATABASE_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.MYSQL_URL;

  if (connectionUrl) {
    const parsed = new URL(connectionUrl);

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
    };
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
  };
};

const dbConfig = getDbConfig();

if (String(process.env.DB_SSL || "false").toLowerCase() === "true") {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const testConnection = async () => {
  try {
    if (String(dbConfig.host || "").includes("railway.internal")) {
      throw new Error(
        "DB_HOST is set to Railway private host (railway.internal). Use Railway public host or set DATABASE_URL/MYSQL_PUBLIC_URL for local development.",
      );
    }

    const rows = await query("SELECT 1 AS ok");
    console.log("Connected to MySQL database successfully");
    return rows?.[0]?.ok === 1;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
};

module.exports = {
  db: pool,
  query,
  testConnection,
};
