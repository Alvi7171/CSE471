const path = require("path");
const mysql = require("mysql2/promise");

const normalizeBoolean = (value) =>
  ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());

const normalizeSqlForSqlite = (sql) =>
  String(sql || "")
    .replace(/\bFOR\s+UPDATE\b/gi, "")
    .replace(
      /DATE_SUB\s*\(\s*NOW\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
      (_, days) => `datetime('now', '-${days} days')`,
    )
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");

const isSelectLikeSql = (sql) => /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);

const formatDbError = (error) =>
  String(
    error?.message ||
      error?.sqlMessage ||
      error?.code ||
      "Unknown database error",
  );

const connectionUrl =
  process.env.DATABASE_URL ||
  process.env.MYSQL_PUBLIC_URL ||
  process.env.MYSQL_URL;
const forceMysql = normalizeBoolean(process.env.USE_MYSQL);
const forceSqlite = normalizeBoolean(process.env.USE_SQLITE);
const hasExplicitMysqlConfig =
  Boolean(connectionUrl) ||
  Boolean(process.env.DB_HOST) ||
  Boolean(process.env.DB_USER) ||
  Boolean(process.env.DB_NAME);
const useSqliteFallback = forceMysql
  ? false
  : forceSqlite || !hasExplicitMysqlConfig;

if (forceMysql && !hasExplicitMysqlConfig) {
  throw new Error(
    "USE_MYSQL=true is set, but no MySQL configuration was found. Set DATABASE_URL/MYSQL_PUBLIC_URL/MYSQL_URL or DB_HOST, DB_USER, DB_NAME.",
  );
}

let db;
let query;
let testConnection;
let engine;

if (useSqliteFallback) {
  const DatabaseSync = require("better-sqlite3");

  const sqlitePath = path.join(__dirname, "..", "mediai_smartcare.db");
  const sqliteDb = new DatabaseSync(sqlitePath);
  sqliteDb.pragma("foreign_keys = ON");

  const ensureSqliteColumn = (tableName, columnName, definition) => {
    const columns = sqliteDb.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = columns.some((column) => column.name === columnName);
    if (!exists) {
      sqliteDb.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    }
  };

  const ensureSqliteSchema = () => {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        phone TEXT UNIQUE,
        address TEXT,
        age INTEGER,
        gender TEXT,
        role TEXT NOT NULL DEFAULT 'patient',
        doctor_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL
      );
    `);

    ensureSqliteColumn("doctors", "degree", "degree TEXT");
    ensureSqliteColumn("doctors", "medical_name", "medical_name TEXT");
    ensureSqliteColumn(
      "doctor_schedules",
      "schedule_date",
      "schedule_date TEXT",
    );
    ensureSqliteColumn(
      "doctor_schedules",
      "max_patients",
      "max_patients INTEGER DEFAULT 10",
    );
    ensureSqliteColumn(
      "appointments",
      "patient_user_id",
      "patient_user_id INTEGER",
    );
    ensureSqliteColumn(
      "appointments",
      "updated_at",
      "updated_at TEXT DEFAULT CURRENT_TIMESTAMP",
    );

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        preference_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        email_enabled INTEGER DEFAULT 1,
        portal_enabled INTEGER DEFAULT 1,
        reminder_enabled INTEGER DEFAULT 1,
        reminder_hours_before INTEGER DEFAULT 24,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        appointment_id INTEGER,
        related_entity_type TEXT,
        related_entity_id INTEGER,
        recipient_role TEXT NOT NULL,
        channel TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        email_address TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        scheduled_for TEXT,
        sent_at TEXT,
        read_at TEXT,
        metadata TEXT,
        dedupe_key TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE
      );
    `);

    ensureSqliteColumn(
      "notifications",
      "related_entity_type",
      "related_entity_type TEXT",
    );
    ensureSqliteColumn(
      "notifications",
      "related_entity_id",
      "related_entity_id INTEGER",
    );

    sqliteDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_user
      ON appointments (patient_user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_channel_status
      ON notifications (user_id, channel, status);
      CREATE INDEX IF NOT EXISTS idx_notifications_scheduled
      ON notifications (status, scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_notifications_appointment
      ON notifications (appointment_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_related_entity
      ON notifications (related_entity_type, related_entity_id);
    `);
  };

  const executeSqlite = (sql, params = []) => {
    const normalizedSql = normalizeSqlForSqlite(sql);
    const statement = sqliteDb.prepare(normalizedSql);

    if (isSelectLikeSql(normalizedSql)) {
      return statement.all(...params);
    }

    const result = statement.run(...params);
    return {
      insertId: Number(result.lastInsertRowid || 0),
      affectedRows: Number(result.changes || 0),
      changes: Number(result.changes || 0),
    };
  };

  const createSqliteConnection = () => {
    let transactionOpen = false;

    return {
      beginTransaction: async () => {
        if (!transactionOpen) {
          sqliteDb.exec("BEGIN IMMEDIATE;");
          transactionOpen = true;
        }
      },
      commit: async () => {
        if (transactionOpen) {
          sqliteDb.exec("COMMIT;");
          transactionOpen = false;
        }
      },
      rollback: async () => {
        if (transactionOpen) {
          sqliteDb.exec("ROLLBACK;");
          transactionOpen = false;
        }
      },
      execute: async (sql, params = []) => {
        const result = executeSqlite(sql, params);
        return [result];
      },
      query: async (sql, params = []) => {
        const result = executeSqlite(sql, params);
        return [result];
      },
      release: () => {
        if (transactionOpen) {
          try {
            sqliteDb.exec("ROLLBACK;");
          } catch (_error) {
            // no-op
          }
          transactionOpen = false;
        }
      },
    };
  };

  ensureSqliteSchema();

  sqliteDb.getConnection = async () => createSqliteConnection();

  db = sqliteDb;
  query = async (sql, params = []) => executeSqlite(sql, params);
  testConnection = async () => {
    try {
      const rows = await query("SELECT 1 AS ok");
      console.log("Connected to SQLite database successfully");
      return Number(rows?.[0]?.ok || 0) === 1;
    } catch (error) {
      const message = formatDbError(error);
      console.error("Database connection failed:", message);
      throw error;
    }
  };
  engine = "sqlite";
} else {
  const getDbConfig = () => {
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

  db = pool;
  query = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  };
  testConnection = async () => {
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
      const message = formatDbError(error);
      console.error("Database connection failed:", message);
      throw error;
    }
  };
  engine = "mysql";
}

module.exports = {
  db,
  query,
  testConnection,
  engine,
};
