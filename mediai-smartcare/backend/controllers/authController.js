const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db, query } = require("../config/database");

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
  doctorProfileId: row.doctor_id,
  createdAt: row.created_at,
  fatherName: row.father_name,
});

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value).trim().length > 0;
};

const mapDoctorProfile = (row) => {
  if (!row) return null;

  return {
    doctorProfileId: row.doctor_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    degree: row.degree,
    specialization: row.specialization,
    department: row.department,
    medicalName: row.medical_name,
    qualification: row.qualification,
    experienceYears: row.experience_years,
    consultationFee: row.consultation_fee,
    isAvailable: Boolean(row.is_available),
    createdAt: row.created_at,
  };
};

const loadDoctorProfile = async (doctorId) => {
  if (!doctorId) {
    return null;
  }

  const rows = await query(
    `
    SELECT
      doctor_id,
      name,
      email,
      phone,
      degree,
      specialization,
      department,
      medical_name,
      qualification,
      experience_years,
      consultation_fee,
      is_available,
      created_at
    FROM doctors
    WHERE doctor_id = ?
    LIMIT 1
    `,
    [doctorId],
  );

  return mapDoctorProfile(rows[0] || null);
};

const buildProfileStatus = (user, doctorProfile) => {
  if (user.role === "doctor") {
    if (!doctorProfile) {
      return {
        key: "unlinked",
        label: "Doctor profile not linked",
        missingFields: ["doctor profile"],
      };
    }

    const missingFields = [];

    if (!hasValue(doctorProfile.phone)) missingFields.push("mobile number");
    if (!hasValue(doctorProfile.specialization))
      missingFields.push("specialization");
    if (!hasValue(doctorProfile.department)) missingFields.push("department");
    if (!hasValue(doctorProfile.experienceYears))
      missingFields.push("experience");
    if (!hasValue(doctorProfile.consultationFee))
      missingFields.push("consultation fee");

    return {
      key: missingFields.length === 0 ? "linked" : "incomplete",
      label:
        missingFields.length === 0
          ? "Linked to doctor profile"
          : "Doctor profile needs updates",
      missingFields,
    };
  }

  if (user.role === "patient") {
    const missingFields = [];

    if (!hasValue(user.fullName)) missingFields.push("name");
    if (!hasValue(user.phone)) missingFields.push("mobile number");
    if (!hasValue(user.age)) missingFields.push("age");
    if (!hasValue(user.gender)) missingFields.push("gender");
    if (!hasValue(user.address)) missingFields.push("address");

    return {
      key: missingFields.length === 0 ? "complete" : "incomplete",
      label:
        missingFields.length === 0
          ? "Patient profile complete"
          : "Patient profile needs updates",
      missingFields,
    };
  }

  return {
    key: "ready",
    label: "Account ready",
    missingFields: [],
  };
};

const buildUserPayload = async (row) => {
  const user = safeUser(row);
  const doctorProfile =
    user.role === "doctor" ? await loadDoctorProfile(user.doctorId) : null;

  return {
    ...user,
    doctorProfile,
    profileStatus: buildProfileStatus(user, doctorProfile),
  };
};

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

const parseNullableInteger = (value, { min, max, fieldName }) => {
  if (value === undefined) return undefined;

  const normalized = normalizeOptional(value);
  if (normalized === null) return null;

  const numericValue = Number(normalized);
  if (
    !Number.isInteger(numericValue) ||
    numericValue < min ||
    numericValue > max
  ) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return numericValue;
};

const parseNullableDecimal = (value, { min, fieldName }) => {
  if (value === undefined) return undefined;

  const normalized = normalizeOptional(value);
  if (normalized === null) return null;

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  return numericValue;
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
      fatherName,
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

    if (cleanPhone) {
      const existingPhone = await query(
        "SELECT user_id FROM users WHERE phone = ? LIMIT 1",
        [cleanPhone],
      );

      if (existingPhone.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already exists",
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
      (full_name, email, password_hash, phone, address, age, gender, role, doctor_id, father_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        normalizeOptional(fatherName),
      ],
    );


    const insertedUserRows = await query(
      "SELECT user_id, full_name, father_name, email, phone, address, age, gender, role, doctor_id, created_at FROM users WHERE user_id = ?",
      [insertResult.insertId],
    );

    const createdUser = insertedUserRows[0];
    const token = signToken(createdUser);
    const responseUser = await buildUserPayload(createdUser);

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      token,
      user: responseUser,
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
      SELECT user_id, full_name, father_name, email, phone, address, age, gender, role, doctor_id, password_hash, created_at
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
    const responseUser = await buildUserPayload(user);

    return res.json({
      success: true,
      message: "Logged in successfully",
      token,
      user: responseUser,
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

    const responseUser = await buildUserPayload(rows[0]);

    return res.json({
      success: true,
      user: responseUser,
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

const updateProfile = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();

    const [userRows] = await connection.execute(
      `
      SELECT
        user_id,
        full_name,
        email,
        phone,
        address,
        age,
        gender,
        role,
        doctor_id,
        created_at
      FROM users
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.user.userId],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const nextFatherName = req.body.fatherName !== undefined ? normalizeOptional(req.body.fatherName) : userRows[0].father_name;


    const currentUser = userRows[0];

    const nextFullName =
      req.body.fullName !== undefined
        ? normalizeOptional(req.body.fullName)
        : currentUser.full_name;
    const nextEmail =
      req.body.email !== undefined
        ? normalizeOptional(req.body.email)
        : currentUser.email;
    const nextPhone =
      req.body.phone !== undefined
        ? normalizeOptional(req.body.phone)
        : currentUser.phone;
    const nextAddress =
      req.body.address !== undefined
        ? normalizeOptional(req.body.address)
        : currentUser.address;

    if (!nextFullName) {
      return res.status(400).json({
        success: false,
        message: "fullName is required",
      });
    }

    if (currentUser.role === "admin" && !nextEmail) {
      return res.status(400).json({
        success: false,
        message: "Admin accounts require email",
      });
    }

    let nextAge = currentUser.age;
    if (req.body.age !== undefined) {
      try {
        nextAge = parseNullableInteger(req.body.age, {
          min: 1,
          max: 120,
          fieldName: "age",
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    let nextGender = currentUser.gender;
    if (req.body.gender !== undefined) {
      nextGender = normalizeOptional(req.body.gender);
      if (
        nextGender &&
        !["Male", "Female", "Other"].includes(String(nextGender))
      ) {
        return res.status(400).json({
          success: false,
          message: "gender must be Male, Female, or Other",
        });
      }
    }

    if (nextEmail) {
      const [existingEmail] = await connection.execute(
        "SELECT user_id FROM users WHERE email = ? AND user_id <> ? LIMIT 1",
        [nextEmail, currentUser.user_id],
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    if (nextPhone) {
      const [existingPhone] = await connection.execute(
        "SELECT user_id FROM users WHERE phone = ? AND user_id <> ? LIMIT 1",
        [nextPhone, currentUser.user_id],
      );

      if (existingPhone.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already exists",
        });
      }
    }

    let doctorRow = null;
    let nextDoctorValues = null;

    if (currentUser.role === "doctor" && currentUser.doctor_id) {
      const [doctorRows] = await connection.execute(
        `
        SELECT
          doctor_id,
          name,
          email,
          phone,
          degree,
          specialization,
          department,
          medical_name,
          qualification,
          experience_years,
          consultation_fee
        FROM doctors
        WHERE doctor_id = ?
        LIMIT 1
        `,
        [currentUser.doctor_id],
      );

      doctorRow = doctorRows[0] || null;

      const nextDegree =
        req.body.degree !== undefined
          ? normalizeOptional(req.body.degree)
          : doctorRow?.degree || null;
      const nextSpecialization =
        req.body.specialization !== undefined
          ? normalizeOptional(req.body.specialization)
          : doctorRow?.specialization || null;
      const nextDepartment =
        req.body.department !== undefined
          ? normalizeOptional(req.body.department)
          : doctorRow?.department || null;
      const nextMedicalName =
        req.body.medicalName !== undefined
          ? normalizeOptional(req.body.medicalName)
          : doctorRow?.medical_name || null;
      const nextQualification =
        req.body.qualification !== undefined
          ? normalizeOptional(req.body.qualification)
          : doctorRow?.qualification || null;

      let nextExperienceYears = doctorRow?.experience_years ?? null;
      if (req.body.experienceYears !== undefined) {
        try {
          nextExperienceYears = parseNullableInteger(req.body.experienceYears, {
            min: 0,
            max: 80,
            fieldName: "experienceYears",
          });
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }

      let nextConsultationFee = doctorRow?.consultation_fee ?? null;
      if (req.body.consultationFee !== undefined) {
        try {
          nextConsultationFee = parseNullableDecimal(req.body.consultationFee, {
            min: 0,
            fieldName: "consultationFee",
          });
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }

      if (nextDepartment && !DEPARTMENT_OPTIONS.includes(nextDepartment)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department",
        });
      }

      if (!nextSpecialization) {
        return res.status(400).json({
          success: false,
          message: "Doctor specialization is required",
        });
      }

      if (!nextDepartment) {
        return res.status(400).json({
          success: false,
          message: "Doctor department is required",
        });
      }

      if (nextEmail) {
        const [existingDoctorEmail] = await connection.execute(
          "SELECT doctor_id FROM doctors WHERE email = ? AND doctor_id <> ? LIMIT 1",
          [nextEmail, currentUser.doctor_id],
        );

        if (existingDoctorEmail.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Doctor email already exists",
          });
        }
      }

      nextDoctorValues = {
        name: nextFullName,
        fatherName: nextFatherName, // Add fatherName to doctor profile updates
        email: nextEmail,
        phone: nextPhone,
        degree: nextDegree,
        specialization: nextSpecialization,
        department: nextDepartment,
        medicalName: nextMedicalName,
        qualification: nextQualification,
        experienceYears: nextExperienceYears,
        consultationFee: nextConsultationFee,
      };
    }

    await connection.beginTransaction();

    await connection.execute(
      `
      UPDATE users
      SET
        full_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        age = ?,
        gender = ?,
        father_name = ?
        
      WHERE user_id = ?
      `,
      [
        nextFullName,
        nextEmail,
        nextPhone,
        nextAddress,
        nextAge,
        nextGender,
        nextFatherName, // Update father_name in users table
        currentUser.user_id,
      ],
    );

    if (doctorRow && nextDoctorValues) {
      await connection.execute(
        `
        UPDATE doctors
        SET
          name = ?,
          email = ?,
          phone = ?,
          degree = ?,
          specialization = ?,
          department = ?,
          medical_name = ?,
          qualification = ?,
          father_name = ?,
          experience_years = ?,
          consultation_fee = ?
        WHERE doctor_id = ?
        `,
        [
          nextDoctorValues.name,
          nextDoctorValues.email,
          nextDoctorValues.phone,
          nextDoctorValues.degree,
          nextDoctorValues.specialization,
          nextDoctorValues.department,
          nextDoctorValues.medicalName,
          nextDoctorValues.qualification,
          nextDoctorValues.experienceYears,
          nextDoctorValues.consultationFee,
          currentUser.doctor_id,
        ],
      );
    }

    await connection.commit();

    const updatedRows = await query(
      "SELECT user_id, full_name, email, phone, address, father_name, gender, role, doctor_id, created_at FROM users WHERE user_id = ? LIMIT 1",
      [currentUser.user_id],
    );

    const responseUser = await buildUserPayload(updatedRows[0]);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: responseUser,
    });
  } catch (error) {
    try {
      if (connection) {
        await connection.rollback();
      }
    } catch (_rollbackError) {
      // no-op
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  register,
  login,
  me,
  updateProfile,
};
