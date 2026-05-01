require("dotenv").config();

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { db, engine } = require("./config/database");
const usingSqlite = engine === "sqlite";

console.log("DB engine:", engine);

const normalizeSqlForSqlite = (sql) =>
  String(sql || "")
    .replace(/\bFOR\s+UPDATE\b/gi, "")
    .replace(
      /DATE_SUB\s*\(\s*NOW\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
      (_, days) => `datetime('now', '-${days} days')`,
    )
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, "")
    .replace(/AUTO_INCREMENT/gi, "AUTOINCREMENT")
    .replace(/TINYINT\(\d+\)/gi, "INTEGER")
    .replace(/ENUM\([^)]+\)/gi, "TEXT")
    .replace(/DECIMAL\(\d+,\s*\d+\)/gi, "REAL");

const hasColumn = async (connection, tableName, columnName) => {
  if (usingSqlite) {
    const rows = connection.prepare(`PRAGMA table_info(${tableName})`).all();
    return rows.some((row) => row.name === columnName);
  }

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
    if (usingSqlite) {
      connection.exec(sql);
    } else {
      await connection.query(sql);
    }
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
  const connection = usingSqlite ? db : await db.getConnection();

  try {
    console.log("Initializing schema...");

    const schemaPath = path.join(__dirname, "models", "schema.sql");
    let schemaSQL = fs.readFileSync(schemaPath, "utf8");

    if (usingSqlite) {
      schemaSQL = normalizeSqlForSqlite(schemaSQL);
    }

    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      if (usingSqlite) {
        connection.exec(statement);
      } else {
        await connection.query(statement);
      }
    }

    // Railway-safe incremental migration for already-created tables.
    if (!usingSqlite) {
      await safeExec(
        connection,
        "ALTER TABLE users MODIFY email VARCHAR(120) NULL",
      );
    }
    if (!(await hasColumn(connection, "users", "address"))) {
      await safeExec(
        connection,
        "ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL",
      );
    }
    if (!(await hasColumn(connection, "users", "Father_name"))) {
      await safeExec(
        connection,
        "ALTER TABLE users ADD COLUMN Father_name VARCHAR(120) NULL",
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

    if (!usingSqlite) {
      await safeExec(
        connection,
        "ALTER TABLE doctors MODIFY email VARCHAR(100) NULL",
      );
    }
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

    if (!usingSqlite) {
      await safeExec(
        connection,
        "ALTER TABLE appointments MODIFY status ENUM('pending', 'confirmed', 'declined', 'cancelled', 'completed') DEFAULT 'pending'",
      );
    }
    if (!(await hasColumn(connection, "appointments", "patient_user_id"))) {
      await safeExec(
        connection,
        "ALTER TABLE appointments ADD COLUMN patient_user_id INT NULL",
      );
      await safeExec(
        connection,
        "ALTER TABLE appointments ADD CONSTRAINT fk_appointments_patient_user FOREIGN KEY (patient_user_id) REFERENCES users (user_id) ON DELETE SET NULL",
      );
      await safeExec(
        connection,
        "CREATE INDEX idx_appointment_patient_user ON appointments (patient_user_id)",
      );
    }

    console.log("Schema migration complete");

    // Initialize Billing/Roster schema with backward-compatible fallback.
    const billingRosterSchemaCandidates = usingSqlite
      ? [
          path.join(__dirname, "models", "billingAndRosterSchema.sql"),
          path.join(__dirname, "models", "rosterSchema.sql"),
        ]
      : [
          path.join(__dirname, "models", "rosterSchema.mysql.sql"),
          path.join(__dirname, "models", "billingAndRosterSchema.mysql.sql"),
        ];
    const billingRosterSchemaPath = billingRosterSchemaCandidates.find((item) =>
      fs.existsSync(item),
    );

    if (billingRosterSchemaPath) {
      let billingRosterSQL = fs.readFileSync(billingRosterSchemaPath, "utf8");

      if (usingSqlite) {
        billingRosterSQL = normalizeSqlForSqlite(billingRosterSQL);
      }

      const billingStatements = billingRosterSQL
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of billingStatements) {
        try {
          if (usingSqlite) {
            connection.exec(statement);
          } else {
            await connection.query(statement);
          }
        } catch (error) {
          const normalizedError = String(error.message || "");
          if (
            !normalizedError.includes("already exists") &&
            !normalizedError.includes("Duplicate key name")
          ) {
            console.error(
              "Error executing billing/roster schema statement:",
              error.message,
            );
          }
        }
      }

      console.log(
        `Billing & Roster schema initialized successfully (${path.basename(billingRosterSchemaPath)})`,
      );
    }

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

    // Seed doctors
    const defaultDoctors = [
      {
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@mediai.com",
        phone: "+8801711111111",
        degree: "MD",
        specialization: "Cardiology",
        department: "Cardiology",
        qualification: "MBBS, MD Cardiology",
        experience_years: 12,
        consultation_fee: 1500.0,
        is_available: 1,
      },
      {
        name: "Dr. Michael Chen",
        email: "michael.chen@mediai.com",
        phone: "+8801722222222",
        degree: "MBBS",
        specialization: "Neurology",
        department: "Neurology",
        qualification: "MBBS, MD Neurology",
        experience_years: 8,
        consultation_fee: 1200.0,
        is_available: 1,
      },
      {
        name: "Dr. Emily Davis",
        email: "emily.davis@mediai.com",
        phone: "+8801733333333",
        degree: "MD",
        specialization: "Pediatrics",
        department: "Pediatrics",
        qualification: "MBBS, MD Pediatrics",
        experience_years: 10,
        consultation_fee: 1000.0,
        is_available: 1,
      },
      {
        name: "Dr. Robert Wilson",
        email: "robert.wilson@mediai.com",
        phone: "+8801744444444",
        degree: "MBBS",
        specialization: "Orthopedics",
        department: "Orthopedics",
        qualification: "MBBS, MS Orthopedics",
        experience_years: 15,
        consultation_fee: 1800.0,
        is_available: 1,
      },
    ];

    for (const doctor of defaultDoctors) {
      const [existsRows] = await connection.execute(
        "SELECT doctor_id FROM doctors WHERE email = ? LIMIT 1",
        [doctor.email],
      );

      if (existsRows.length > 0) {
        continue;
      }

      await connection.execute(
        `
        INSERT INTO doctors
        (name, email, phone, degree, specialization, department, qualification, experience_years, consultation_fee, is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          doctor.name,
          doctor.email,
          doctor.phone,
          doctor.degree,
          doctor.specialization,
          doctor.department,
          doctor.qualification,
          doctor.experience_years,
          doctor.consultation_fee,
          doctor.is_available,
        ],
      );
    }


    // Legacy appointment seed intentionally skipped.
    // Current schema requires schedule_id for appointments.
    console.log(
      "Skipping legacy appointment seed data (requires explicit schedule_id)",
    );

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
    if (typeof connection.release === "function") {
      connection.release();
    }
  }
};

run();
