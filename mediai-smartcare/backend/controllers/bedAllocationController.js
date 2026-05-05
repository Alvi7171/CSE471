const { query, db, engine } = require("../config/database");

let initialized = false;

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeGender = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["male", "female", "other"].includes(normalized)) {
    return normalized;
  }
  return "other";
};

const normalizeSeverity = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["low", "medium", "high", "emergency"].includes(normalized)) {
    return normalized;
  }
  return "medium";
};

const parseDateTimeInput = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.length === 16 ? `${raw}:00` : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inferClinicalSignalsFromDisease = (diseaseValue) => {
  const disease = String(diseaseValue || "").trim().toLowerCase();

  const emergencyKeywords = [
    "accident",
    "trauma",
    "stroke",
    "heart attack",
    "cardiac arrest",
    "brain hemorrhage",
    "severe bleeding",
    "emergency",
  ];
  const operationKeywords = [
    "surgery",
    "operation",
    "appendicitis",
    "fracture",
    "c-section",
  ];
  const contagiousKeywords = [
    "covid",
    "tuberculosis",
    "tb",
    "chickenpox",
    "measles",
    "cholera",
    "dengue",
    "influenza",
    "viral",
  ];
  const longTermKeywords = [
    "cancer",
    "dialysis",
    "kidney failure",
    "renal failure",
    "paralysis",
    "rehab",
    "chronic",
    "long term",
  ];

  const hasKeyword = (keywords) =>
    keywords.some((keyword) => disease.includes(keyword));

  const requiresOperation = hasKeyword(operationKeywords);
  const isEmergency = requiresOperation || hasKeyword(emergencyKeywords);
  const isContagious = hasKeyword(contagiousKeywords);
  const isLongTerm = hasKeyword(longTermKeywords);

  const severity = isEmergency
    ? "emergency"
    : isLongTerm
      ? "high"
      : "low";

  return {
    severity,
    isEmergency,
    isLongTerm,
    isContagious,
    requiresOperation,
  };
};

const normalizeBool = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value || "").toLowerCase() === "true";

const formatDateTimeForDb = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const categoryLabels = {
  emergency: "Emergency",
  long_term: "Long Term",
  pediatric: "Pediatric",
  isolation: "Isolation",
  ot: "Operation Theater",
  general: "General",
};

const seedBeds = [
  ...Array.from({ length: 10 }, (_, i) => ({
    bed_code: `ER-${String(i + 1).padStart(2, "0")}`,
    building: "Main Hospital",
    floor_label: "Ground Floor",
    floor_order: 1,
    category: "emergency",
    allowed_gender: "any",
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    bed_code: `LT-${String(i + 1).padStart(2, "0")}`,
    building: "Main Hospital",
    floor_label: "3rd Floor",
    floor_order: 3,
    category: "long_term",
    allowed_gender: "any",
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    bed_code: `PD-${String(i + 1).padStart(2, "0")}`,
    building: "Main Hospital",
    floor_label: "2nd Floor - Pediatric",
    floor_order: 2,
    category: "pediatric",
    allowed_gender: "any",
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    bed_code: `ISO-${String(i + 1).padStart(2, "0")}`,
    building: "Isolation Block",
    floor_label: "Ground Floor",
    floor_order: 1,
    category: "isolation",
    allowed_gender: "any",
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    bed_code: `OT-${String(i + 1).padStart(2, "0")}`,
    building: "OT Complex",
    floor_label: "Ground Floor",
    floor_order: 1,
    category: "ot",
    allowed_gender: "any",
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    bed_code: `GN-${String(i + 1).padStart(2, "0")}`,
    building: "Main Hospital",
    floor_label: "1st Floor",
    floor_order: 1,
    category: "general",
    allowed_gender: "any",
  })),
];

const ensureTables = async () => {
  if (initialized) return;

  if (engine === "sqlite") {
    await query(`
      CREATE TABLE IF NOT EXISTS bed_inventory (
        bed_id INTEGER PRIMARY KEY AUTOINCREMENT,
        bed_code TEXT NOT NULL UNIQUE,
        building TEXT NOT NULL,
        floor_label TEXT NOT NULL,
        floor_order INTEGER NOT NULL DEFAULT 1,
        category TEXT NOT NULL,
        allowed_gender TEXT NOT NULL DEFAULT 'any',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS bed_allocations (
        allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        bed_id INTEGER NOT NULL,
        patient_name TEXT NOT NULL,
        patient_age INTEGER NOT NULL,
        patient_gender TEXT NOT NULL,
        disease TEXT,
        severity TEXT NOT NULL DEFAULT 'medium',
        is_emergency INTEGER DEFAULT 0,
        is_long_term INTEGER DEFAULT 0,
        is_contagious INTEGER DEFAULT 0,
        requires_operation INTEGER DEFAULT 0,
        admit_start_at TEXT NOT NULL,
        admit_end_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bed_id) REFERENCES bed_inventory(bed_id)
      )
    `);

    await query(
      "CREATE INDEX IF NOT EXISTS idx_bed_allocations_active ON bed_allocations(bed_id, status, admit_end_at)",
    );
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS bed_inventory (
        bed_id INT AUTO_INCREMENT PRIMARY KEY,
        bed_code VARCHAR(40) NOT NULL UNIQUE,
        building VARCHAR(120) NOT NULL,
        floor_label VARCHAR(120) NOT NULL,
        floor_order INT NOT NULL DEFAULT 1,
        category ENUM('emergency','long_term','pediatric','isolation','ot','general') NOT NULL,
        allowed_gender ENUM('male','female','other','any') NOT NULL DEFAULT 'any',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bed_inventory_filter (building, floor_order, category, allowed_gender, is_active)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS bed_allocations (
        allocation_id INT AUTO_INCREMENT PRIMARY KEY,
        bed_id INT NOT NULL,
        patient_name VARCHAR(140) NOT NULL,
        patient_age INT NOT NULL,
        patient_gender ENUM('male','female','other') NOT NULL,
        disease VARCHAR(220),
        severity ENUM('low','medium','high','emergency') NOT NULL DEFAULT 'medium',
        is_emergency TINYINT(1) DEFAULT 0,
        is_long_term TINYINT(1) DEFAULT 0,
        is_contagious TINYINT(1) DEFAULT 0,
        requires_operation TINYINT(1) DEFAULT 0,
        admit_start_at DATETIME NOT NULL,
        admit_end_at DATETIME NOT NULL,
        status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_bed_allocations_bed FOREIGN KEY (bed_id) REFERENCES bed_inventory (bed_id) ON DELETE CASCADE,
        INDEX idx_bed_allocations_active (bed_id, status, admit_end_at)
      )
    `);
  }

  const countRows = await query("SELECT COUNT(*) AS total FROM bed_inventory");
  const totalBeds = Number(countRows[0]?.total || 0);

  if (totalBeds === 0) {
    for (const bed of seedBeds) {
      await query(
        `
        INSERT INTO bed_inventory (
          bed_code,
          building,
          floor_label,
          floor_order,
          category,
          allowed_gender,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [
          bed.bed_code,
          bed.building,
          bed.floor_label,
          bed.floor_order,
          bed.category,
          bed.allowed_gender,
        ],
      );
    }
  }

  initialized = true;
};

const completeExpiredAllocations = async () => {
  await query(
    `
    UPDATE bed_allocations
    SET status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active'
      AND admit_end_at <= CURRENT_TIMESTAMP
    `,
  );
};

const getPriorityProfile = ({
  patientAge,
  severity,
  isEmergency,
  isLongTerm,
  isContagious,
  requiresOperation,
}) => {
  if (requiresOperation || isEmergency || severity === "emergency") {
    return {
      category: "ot",
      building: "OT Complex",
      floor_label: "Ground Floor",
      reason:
        "Emergency/critical disease profile prioritized to OT for rapid intervention.",
    };
  }

  if (isContagious) {
    return {
      category: "isolation",
      building: "Isolation Block",
      reason: "Contagious disease requires separate building.",
    };
  }

  if (patientAge < 15) {
    return {
      category: "pediatric",
      building: "Main Hospital",
      floor_label: "2nd Floor - Pediatric",
      reason: "Child patient routed to pediatric floor.",
    };
  }

  if (isLongTerm) {
    return {
      category: "long_term",
      building: "Main Hospital",
      floor_label: "3rd Floor",
      reason: "Long-term admission routed to upper floor beds.",
    };
  }

  return {
    category: "general",
    building: "Main Hospital",
    reason: "General case routed to standard bed allocation pool.",
  };
};

const scoreBed = (bed, priorityProfile, patientGender) => {
  let score = 0;

  if (bed.category === priorityProfile.category) score += 100;
  if (bed.building === priorityProfile.building) score += 60;
  if (priorityProfile.floor_label && bed.floor_label === priorityProfile.floor_label) {
    score += 40;
  }

  if (bed.allowed_gender === "any") score += 20;
  if (bed.allowed_gender === patientGender) score += 30;

  score += Math.max(0, 10 - Number(bed.floor_order || 1));

  return score;
};

const getAvailableBeds = async () => {
  await ensureTables();
  await completeExpiredAllocations();

  return query(
    `
    SELECT
      b.bed_id,
      b.bed_code,
      b.building,
      b.floor_label,
      b.floor_order,
      b.category,
      b.allowed_gender,
      b.is_active
    FROM bed_inventory b
    LEFT JOIN bed_allocations a
      ON a.bed_id = b.bed_id
      AND a.status = 'active'
      AND a.admit_end_at > CURRENT_TIMESTAMP
    WHERE b.is_active = 1
      AND a.allocation_id IS NULL
    ORDER BY b.floor_order ASC, b.bed_code ASC
    `,
  );
};

const suggestBedCandidates = async (payload) => {
  const patientAge = Math.max(0, toInt(payload.patientAge, 0));
  const patientGender = normalizeGender(payload.patientGender);
  const inferred = inferClinicalSignalsFromDisease(payload.disease);

  const profile = getPriorityProfile({
    patientAge,
    severity: inferred.severity,
    isEmergency: inferred.isEmergency,
    isLongTerm: inferred.isLongTerm,
    isContagious: inferred.isContagious,
    requiresOperation: inferred.requiresOperation,
  });

  const availableBeds = await getAvailableBeds();

  const candidates = availableBeds
    .filter(
      (bed) =>
        bed.allowed_gender === "any" ||
        String(bed.allowed_gender || "").toLowerCase() === patientGender,
    )
    .map((bed) => ({
      ...bed,
      categoryLabel: categoryLabels[bed.category] || bed.category,
      score: scoreBed(bed, profile, patientGender),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return {
    inferred,
    profile,
    candidates,
  };
};

exports.getBedSummary = async (_req, res) => {
  try {
    await ensureTables();
    await completeExpiredAllocations();

    const totals = await query(
      `
      SELECT
        COUNT(*) AS total_beds,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_beds
      FROM bed_inventory
      `,
    );

    const occupancy = await query(
      `
      SELECT
        COUNT(*) AS occupied_beds
      FROM bed_allocations
      WHERE status = 'active'
        AND admit_end_at > CURRENT_TIMESTAMP
      `,
    );

    const byCategory = await query(
      `
      SELECT
        b.category,
        COUNT(*) AS total,
        SUM(CASE WHEN a.allocation_id IS NULL THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN a.allocation_id IS NOT NULL THEN 1 ELSE 0 END) AS occupied
      FROM bed_inventory b
      LEFT JOIN bed_allocations a
        ON a.bed_id = b.bed_id
        AND a.status = 'active'
        AND a.admit_end_at > CURRENT_TIMESTAMP
      WHERE b.is_active = 1
      GROUP BY b.category
      ORDER BY b.category ASC
      `,
    );

    const totalBeds = Number(totals[0]?.active_beds || totals[0]?.total_beds || 0);
    const occupiedBeds = Number(occupancy[0]?.occupied_beds || 0);

    return res.json({
      success: true,
      summary: {
        totalBeds,
        occupiedBeds,
        availableBeds: Math.max(0, totalBeds - occupiedBeds),
      },
      categoryBreakdown: byCategory.map((row) => ({
        category: row.category,
        categoryLabel: categoryLabels[row.category] || row.category,
        total: Number(row.total || 0),
        available: Number(row.available || 0),
        occupied: Number(row.occupied || 0),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load bed summary",
      error: error.message,
    });
  }
};

exports.listBeds = async (req, res) => {
  try {
    await ensureTables();
    await completeExpiredAllocations();

    const { category, floor, building, gender, status } = req.query;

    let sql = `
      SELECT
        b.bed_id,
        b.bed_code,
        b.building,
        b.floor_label,
        b.floor_order,
        b.category,
        b.allowed_gender,
        a.allocation_id,
        a.patient_name,
        a.patient_age,
        a.patient_gender,
        a.disease,
        a.severity,
        a.is_emergency,
        a.is_long_term,
        a.is_contagious,
        a.requires_operation,
        a.admit_start_at,
        a.admit_end_at,
        a.notes,
        a.created_at AS booked_at
      FROM bed_inventory b
      LEFT JOIN bed_allocations a
        ON a.bed_id = b.bed_id
        AND a.status = 'active'
        AND a.admit_end_at > CURRENT_TIMESTAMP
      WHERE b.is_active = 1
    `;

    const params = [];

    if (category) {
      sql += " AND b.category = ?";
      params.push(String(category).toLowerCase());
    }

    if (floor) {
      sql += " AND b.floor_label = ?";
      params.push(String(floor));
    }

    if (building) {
      sql += " AND b.building = ?";
      params.push(String(building));
    }

    if (gender) {
      const normalizedGender = normalizeGender(gender);
      sql += " AND (b.allowed_gender = 'any' OR b.allowed_gender = ?)";
      params.push(normalizedGender);
    }

    if (status === "available") {
      sql += " AND a.allocation_id IS NULL";
    }

    if (status === "occupied") {
      sql += " AND a.allocation_id IS NOT NULL";
    }

    sql += " ORDER BY b.floor_order ASC, b.bed_code ASC";

    const rows = await query(sql, params);

    const beds = rows.map((row) => {
      const occupied = Boolean(row.allocation_id);
      return {
        bed_id: row.bed_id,
        bed_code: row.bed_code,
        building: row.building,
        floor_label: row.floor_label,
        floor_order: Number(row.floor_order || 1),
        category: row.category,
        categoryLabel: categoryLabels[row.category] || row.category,
        allowed_gender: row.allowed_gender,
        status: occupied ? "occupied" : "available",
        color: occupied ? "red" : "green",
        allocation: occupied
          ? {
              allocation_id: row.allocation_id,
              patient_name: row.patient_name,
              patient_age: row.patient_age,
              patient_gender: row.patient_gender,
              disease: row.disease,
              severity: row.severity,
              is_emergency: normalizeBool(row.is_emergency),
              is_long_term: normalizeBool(row.is_long_term),
              is_contagious: normalizeBool(row.is_contagious),
              requires_operation: normalizeBool(row.requires_operation),
              admit_start_at: row.admit_start_at,
              admit_end_at: row.admit_end_at,
              notes: row.notes,
              booked_at: row.booked_at,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      count: beds.length,
      beds,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load bed dashboard",
      error: error.message,
    });
  }
};

exports.suggestBed = async (req, res) => {
  try {
    await ensureTables();
    await completeExpiredAllocations();

    const patientAge = Math.max(0, toInt(req.body.patientAge, 0));
    const patientName = String(req.body.patientName || "").trim();
    const disease = String(req.body.disease || "").trim();

    if (!patientName || !patientAge || !disease) {
      return res.status(400).json({
        success: false,
        message: "patientName, patientAge, and disease are required",
      });
    }

    const { profile, candidates, inferred } = await suggestBedCandidates(req.body);

    return res.json({
      success: true,
      suggestion: {
        reason: profile.reason,
        inferredSeverity: inferred.severity,
        inferredSignals: inferred,
        preferredCategory: profile.category,
        preferredCategoryLabel: categoryLabels[profile.category] || profile.category,
        preferredBuilding: profile.building,
        preferredFloor: profile.floor_label || null,
      },
      candidates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to suggest bed",
      error: error.message,
    });
  }
};

exports.allocateBed = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await ensureTables();
    await completeExpiredAllocations();

    const patientName = String(req.body.patientName || "").trim();
    const patientAge = Math.max(0, toInt(req.body.patientAge, 0));
    const patientGender = normalizeGender(req.body.patientGender);
    const disease = String(req.body.disease || "").trim();
    const inferred = inferClinicalSignalsFromDisease(disease);
    const severity = normalizeSeverity(inferred.severity);
    const isEmergency = inferred.isEmergency;
    const isLongTerm = inferred.isLongTerm;
    const isContagious = inferred.isContagious;
    const requiresOperation = inferred.requiresOperation;
    const notes = String(req.body.notes || "").trim() || null;
    const requestedBedId = toInt(req.body.bedId, 0);

    if (!patientName || !patientAge || !disease) {
      return res.status(400).json({
        success: false,
        message: "patientName, patientAge, and disease are required",
      });
    }

    const startAt = parseDateTimeInput(req.body.admissionStartAt);
    const endAt = parseDateTimeInput(req.body.freedomAt);

    if (!startAt || !endAt) {
      return res.status(400).json({
        success: false,
        message: "admissionStartAt and freedomAt are required (datetime)",
      });
    }

    if (endAt.getTime() <= startAt.getTime()) {
      return res.status(400).json({
        success: false,
        message: "freedomAt must be later than admissionStartAt",
      });
    }

    let bedId = requestedBedId;

    if (!bedId) {
      const { candidates } = await suggestBedCandidates({
        patientAge,
        patientGender,
        disease,
      });

      bedId = Number(candidates[0]?.bed_id || 0);
    }

    if (!bedId) {
      return res.status(409).json({
        success: false,
        message: "No suitable bed is available right now",
      });
    }

    await connection.beginTransaction();

    const [bedRows] = await connection.execute(
      `
      SELECT bed_id, bed_code, category, building, floor_label, allowed_gender
      FROM bed_inventory
      WHERE bed_id = ?
        AND is_active = 1
      LIMIT 1
      FOR UPDATE
      `,
      [bedId],
    );

    if (bedRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Bed not found",
      });
    }

    const bed = bedRows[0];
    const allowedGender = String(bed.allowed_gender || "any").toLowerCase();
    if (allowedGender !== "any" && allowedGender !== patientGender) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Selected bed is not compatible with patient gender",
      });
    }

    const [activeRows] = await connection.execute(
      `
      SELECT allocation_id
      FROM bed_allocations
      WHERE bed_id = ?
        AND status = 'active'
        AND admit_end_at > CURRENT_TIMESTAMP
      LIMIT 1
      FOR UPDATE
      `,
      [bedId],
    );

    if (activeRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Bed is already booked",
      });
    }

    const [insertResult] = await connection.execute(
      `
      INSERT INTO bed_allocations (
        bed_id,
        patient_name,
        patient_age,
        patient_gender,
        disease,
        severity,
        is_emergency,
        is_long_term,
        is_contagious,
        requires_operation,
        admit_start_at,
        admit_end_at,
        status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `,
      [
        bedId,
        patientName,
        patientAge,
        patientGender,
        disease,
        severity,
        isEmergency ? 1 : 0,
        isLongTerm ? 1 : 0,
        isContagious ? 1 : 0,
        requiresOperation ? 1 : 0,
        formatDateTimeForDb(startAt),
        formatDateTimeForDb(endAt),
        notes,
      ],
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Bed allocated successfully",
      allocation: {
        allocation_id: insertResult.insertId,
        bed_id: bed.bed_id,
        bed_code: bed.bed_code,
        category: bed.category,
        categoryLabel: categoryLabels[bed.category] || bed.category,
        building: bed.building,
        floor_label: bed.floor_label,
        patient_name: patientName,
        admit_start_at: formatDateTimeForDb(startAt),
        admit_end_at: formatDateTimeForDb(endAt),
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Failed to allocate bed",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.releaseAllocation = async (req, res) => {
  try {
    await ensureTables();

    const allocationId = toInt(req.params.allocationId, 0);
    if (!allocationId) {
      return res.status(400).json({
        success: false,
        message: "Invalid allocationId",
      });
    }

    const result = await query(
      `
      UPDATE bed_allocations
      SET status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE allocation_id = ?
        AND status = 'active'
      `,
      [allocationId],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Active allocation not found",
      });
    }

    return res.json({
      success: true,
      message: "Bed released successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to release bed",
      error: error.message,
    });
  }
};
