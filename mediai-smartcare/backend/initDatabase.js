require("dotenv").config();

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { db } = require("./config/database");

const hasColumn = async (connection, tableName, columnName) => {
  const [rows] = await connection.execute(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName],
  );

  return rows.length > 0;
};

const safeExec = async (connection, sql) => {
  try {
    await connection.query(sql);
  } catch (error) {
    const ignoredPatterns = [
      "Duplicate column name",
      "already exists",
      "check that column/key exists",
      "doesn't exist",
    ];

    if (
      ignoredPatterns.some((pattern) => String(error.message).includes(pattern))
    ) {
      return;
    }

    throw error;
  }
};

const run = async () => {
  const connection = await db.getConnection();

  try {
    console.log("Initializing MySQL schema...");

    const schemaPath = path.join(__dirname, "models", "schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await connection.query(statement);
    }

    // Railway-safe incremental migration for already-created tables.
    await safeExec(
      connection,
      "ALTER TABLE users MODIFY email VARCHAR(120) NULL",
    );
    if (!(await hasColumn(connection, "users", "address"))) {
      await safeExec(
        connection,
        "ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL",
      );
    }
    if (!(await hasColumn(connection, "users", "age"))) {
      await safeExec(connection, "ALTER TABLE users ADD COLUMN age INT NULL");
    }
    if (!(await hasColumn(connection, "users", "gender"))) {
      await safeExec(
        connection,
        "ALTER TABLE users ADD COLUMN gender ENUM('Male', 'Female', 'Other') NULL",
      );
    }

    await safeExec(
      connection,
      "ALTER TABLE doctors MODIFY email VARCHAR(100) NULL",
    );
    if (!(await hasColumn(connection, "doctors", "degree"))) {
      await safeExec(
        connection,
        "ALTER TABLE doctors ADD COLUMN degree VARCHAR(120) NULL",
      );
    }
    if (!(await hasColumn(connection, "doctors", "medical_name"))) {
      await safeExec(
        connection,
        "ALTER TABLE doctors ADD COLUMN medical_name VARCHAR(180) NULL",
      );
    }

    await safeExec(
      connection,
      "ALTER TABLE appointments MODIFY status ENUM('pending', 'confirmed', 'declined', 'cancelled', 'completed') DEFAULT 'pending'",
    );

    console.log("Schema migration complete");

    const defaultUsers = [
      {
        fullName: "Admin User",
        email: "admin@mediai.com",
        password: "Admin@123",
        role: "admin",
        doctorId: null,
        phone: "+8801700000000",
        address: null,
        age: null,
        gender: null,
      },
      {
        fullName: "Patient Demo",
        email: "patient@mediai.com",
        password: "Patient@123",
        role: "patient",
        doctorId: null,
        phone: "+8801800000000",
        address: "Dhaka",
        age: 28,
        gender: "Female",
      },
    ];

    for (const user of defaultUsers) {
      const [existsRows] = await connection.execute(
        "SELECT user_id FROM users WHERE email = ? LIMIT 1",
        [user.email],
      );

      if (existsRows.length > 0) {
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 10);
      await connection.execute(
        `
        INSERT INTO users
        (full_name, email, password_hash, phone, address, age, gender, role, doctor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.fullName,
          user.email,
          passwordHash,
          user.phone,
          user.address,
          user.age,
          user.gender,
          user.role,
          user.doctorId,
        ],
      );
    }

    await connection.execute(
      `
      UPDATE doctors
      SET degree = COALESCE(degree, qualification),
          medical_name = COALESCE(medical_name, 'MediAI SmartCare Hospital')
      WHERE doctor_id = 1
      `,
    );

    console.log("Seed users ready");
    console.log("admin@mediai.com / Admin@123");
    console.log("patient@mediai.com / Patient@123");

    process.exit(0);
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  } finally {
    connection.release();
  }
};

run();
