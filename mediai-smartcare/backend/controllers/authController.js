const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

const DEPARTMENT_OPTIONS = [
  "Cardiology",
  "Neurology",
  "Gynecology",
  "Pediatrics",
  "General Medicine",
  "Dermatology",
  "Orthopedics",
  "Psychiatry",
  "ENT",
  "Ophthalmology",
  "Urology",
  "Oncology",
  "Nephrology",
  "Emergency Medicine",
  "Other",
];

const safeUser = (row) => ({
  userId: row.user_id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  age: row.age,
  gender: row.gender,
  role: row.role,
  doctorId: row.doctor_id,
  createdAt: row.created_at,
});

const signToken = (user) =>
  jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

const normalizeOptional = (value) => {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      role = "patient",
      degree,
      department,
      experienceYears,
      medicalName,
      address,
      age,
      gender,
    } = req.body;

    if (!fullName || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName and password are required",
      });
    }

    const normalizedRole = String(role).toLowerCase();
    if (!["patient", "doctor", "admin"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "role must be patient, doctor, or admin",
      });
    }

    const cleanEmail = normalizeOptional(email);
    const cleanPhone = normalizeOptional(phone);

    if (normalizedRole === "admin" && !cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Admin registration requires email",
      });
    }

    if (
      (normalizedRole === "doctor" || normalizedRole === "patient") &&
      !cleanPhone
    ) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    if (cleanEmail) {
      const existingEmail = await query(
        "SELECT user_id FROM users WHERE email = ? LIMIT 1",
        [cleanEmail],
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    let doctorId = null;

    if (normalizedRole === "doctor") {
      const cleanDegree = normalizeOptional(degree);
      const cleanDepartment = normalizeOptional(department);
      const cleanMedicalName = normalizeOptional(medicalName);
      const expYears = Number(experienceYears || 0);

      if (!cleanDegree || !cleanDepartment || !cleanMedicalName) {
        return res.status(400).json({
          success: false,
          message:
            "Doctor registration requires degree, department, medicalName, and experienceYears",
        });
      }

      if (!DEPARTMENT_OPTIONS.includes(cleanDepartment)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department",
        });
      }

      if (!Number.isFinite(expYears) || expYears < 0 || expYears > 80) {
        return res.status(400).json({
          success: false,
          message: "experienceYears must be between 0 and 80",
        });
      }

      const doctorInsert = await query(
        `
        INSERT INTO doctors
        (name, email, phone, degree, specialization, department, medical_name, qualification, experience_years)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          fullName,
          cleanEmail,
          cleanPhone,
          cleanDegree,
          cleanDepartment,
          cleanDepartment,
          cleanMedicalName,
          cleanDegree,
          expYears,
        ],
      );

      doctorId = doctorInsert.insertId;
    }

    if (normalizedRole === "patient") {
      const cleanAddress = normalizeOptional(address);
      const patientAge = Number(age || 0);
      const cleanGender = normalizeOptional(gender);

      if (
        !cleanAddress ||
        !cleanGender ||
        !Number.isFinite(patientAge) ||
        patientAge <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Patient registration requires address, age and gender",
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertResult = await query(
      `
      INSERT INTO users
      (full_name, email, password_hash, phone, address, age, gender, role, doctor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fullName,
        cleanEmail,
        passwordHash,
        cleanPhone,
        normalizeOptional(address),
        age ? Number(age) : null,
        normalizeOptional(gender),
        normalizedRole,
        doctorId,
      ],
    );

    const insertedUserRows = await query(
      "SELECT user_id, full_name, email, phone, address, age, gender, role, doctor_id, created_at FROM users WHERE user_id = ?",
      [insertResult.insertId],
    );

    const createdUser = insertedUserRows[0];
    const token = signToken(createdUser);

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      token,
      user: safeUser(createdUser),
    });
  } catch (error) {
    if (String(error.message).includes("Duplicate entry")) {
      return res.status(409).json({
        success: false,
        message: "Duplicate email or doctor record detected",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, identifier } = req.body;

    if ((!email && !identifier) || !password) {
      return res.status(400).json({
        success: false,
        message: "email (or identifier) and password are required",
      });
    }

    const loginIdentifier =
      normalizeOptional(identifier) || normalizeOptional(email);

    const rows = await query(
      `
      SELECT user_id, full_name, email, phone, address, age, gender, role, doctor_id, password_hash, created_at
      FROM users
      WHERE email = ? OR phone = ?
      LIMIT 1
      `,
      [loginIdentifier, loginIdentifier],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password",
      });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/mobile or password",
      });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      message: "Logged in successfully",
      token,
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};

const me = async (req, res) => {
  try {
    const rows = await query(
      "SELECT user_id, full_name, email, phone, address, age, gender, role, doctor_id, created_at FROM users WHERE user_id = ? LIMIT 1",
      [req.user.userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: safeUser(rows[0]),
      registerOptions: {
        doctorDepartments: DEPARTMENT_OPTIONS,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load profile",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  me,
};
