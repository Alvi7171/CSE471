require("dotenv").config();

console.log("USE_SQLITE:", process.env.USE_SQLITE);

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { db } = require("./config/database");

const normalizeSqlForSqlite = (sql) =>
  String(sql || "")
    .replace(/\bFOR\s+UPDATE\b/gi, "")
    .replace(
      /DATE_SUB\s*\(\s*NOW\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
      (_, days) => `datetime('now', '-${days} days')`,
    )
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
  if (process.env.USE_SQLITE === 'true') {
    const rows = connection.prepare(`PRAGMA table_info(${tableName})`).all();
    return rows.some(row => row.name === columnName);
  } else {
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
  }
};

const safeExec = async (connection, sql) => {
  try {
    if (process.env.USE_SQLITE === 'true') {
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
  const connection = process.env.USE_SQLITE === 'true' ? db : await db.getConnection();

  try {
    console.log("Initializing schema...");

    const schemaPath = path.join(__dirname, "models", "schema.sql");
    let schemaSQL = fs.readFileSync(schemaPath, "utf8");

    if (process.env.USE_SQLITE === 'true') {
      schemaSQL = normalizeSqlForSqlite(schemaSQL);
    }

    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      if (process.env.USE_SQLITE === 'true') {
        connection.exec(statement);
      } else {
        await connection.query(statement);
      }
    }

    // Railway-safe incremental migration for already-created tables.
    if (process.env.USE_SQLITE !== 'true') {
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
    if (!(await hasColumn(connection, "users", "age"))) {
      await safeExec(connection, "ALTER TABLE users ADD COLUMN age INT NULL");
    }
    if (!(await hasColumn(connection, "users", "gender"))) {
      await safeExec(
        connection,
        "ALTER TABLE users ADD COLUMN gender ENUM('Male', 'Female', 'Other') NULL",
      );
    }

    if (process.env.USE_SQLITE !== 'true') {
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

    if (process.env.USE_SQLITE !== 'true') {
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
        consultation_fee: 1500.00,
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
        consultation_fee: 1200.00,
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
        consultation_fee: 1000.00,
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
        consultation_fee: 1800.00,
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

    // Seed appointments
    const defaultAppointments = [
      {
        doctor_id: 1,
        patient_name: "John Smith",
        patient_age: 45,
        patient_gender: "Male",
        patient_phone: "+8801855555555",
        patient_email: "john.smith@email.com",
        appointment_date: "2024-04-15",
        appointment_time: "10:00:00",
        status: "completed",
        symptoms: "Chest pain and shortness of breath",
      },
      {
        doctor_id: 1,
        patient_name: "Mary Johnson",
        patient_age: 32,
        patient_gender: "Female",
        patient_phone: "+8801866666666",
        patient_email: "mary.johnson@email.com",
        appointment_date: "2024-04-16",
        appointment_time: "14:30:00",
        status: "completed",
        symptoms: "Irregular heartbeat",
      },
      {
        doctor_id: 2,
        patient_name: "David Brown",
        patient_age: 28,
        patient_gender: "Male",
        patient_phone: "+8801877777777",
        patient_email: "david.brown@email.com",
        appointment_date: "2024-04-17",
        appointment_time: "11:00:00",
        status: "completed",
        symptoms: "Severe headaches and dizziness",
      },
      {
        doctor_id: 3,
        patient_name: "Lisa Anderson",
        patient_age: 6,
        patient_gender: "Female",
        patient_phone: " +8801888888888",
        patient_email: "lisa.anderson@email.com",
        appointment_date: "2024-04-18",
        appointment_time: "09:00:00",
        status: "completed",
        symptoms: "Fever and cough",
      },
      {
        doctor_id: 4,
        patient_name: "James Wilson",
        patient_age: 55,
        patient_gender: "Male",
        patient_phone: "+8801899999999",
        patient_email: "james.wilson@email.com",
        appointment_date: "2024-04-19",
        appointment_time: "15:00:00",
        status: "completed",
        symptoms: "Knee pain and difficulty walking",
      },
      {
        doctor_id: 1,
        patient_name: "Anna Garcia",
        patient_age: 38,
        patient_gender: "Female",
        patient_phone: "+8801811111111",
        patient_email: "anna.garcia@email.com",
        appointment_date: "2024-04-20",
        appointment_time: "13:00:00",
        status: "completed",
        symptoms: "High blood pressure",
      },
      {
        doctor_id: 2,
        patient_name: "Robert Lee",
        patient_age: 42,
        patient_gender: "Male",
        patient_phone: "+8801822222222",
        patient_email: "robert.lee@email.com",
        appointment_date: "2024-04-21",
        appointment_time: "10:30:00",
        status: "completed",
        symptoms: "Memory loss and confusion",
      },
      {
        doctor_id: 3,
        patient_name: "Emma Taylor",
        patient_age: 8,
        patient_gender: "Female",
        patient_phone: "+8801833333333",
        patient_email: "emma.taylor@email.com",
        appointment_date: "2024-04-22",
        appointment_time: "11:30:00",
        status: "completed",
        symptoms: "Ear infection",
      },
    ];

    for (const appointment of defaultAppointments) {
      // Check if appointment already exists (by date, time, doctor)
      const [existsRows] = await connection.execute(
        "SELECT appointment_id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? LIMIT 1",
        [appointment.doctor_id, appointment.appointment_date, appointment.appointment_time],
      );

      if (existsRows.length > 0) {
        continue;
      }

      await connection.execute(
        `
        INSERT INTO appointments
        (doctor_id, patient_name, patient_age, patient_gender, patient_phone, patient_email, appointment_date, appointment_time, status, symptoms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          appointment.doctor_id,
          appointment.patient_name,
          appointment.patient_age,
          appointment.patient_gender,
          appointment.patient_phone,
          appointment.patient_email,
          appointment.appointment_date,
          appointment.appointment_time,
          appointment.status,
          appointment.symptoms,
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
