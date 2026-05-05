const { query, engine } = require("../config/database");

let initialized = false;
const LOW_STOCK_BOX_THRESHOLD = 10;

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeDateInput = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const dateOnly = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
};

const daysBetweenToday = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const normalizeMedicine = (row) => ({
  ...row,
  stock_quantity: toInt(row.stock_quantity, 0),
  unit_price: toFloat(row.unit_price, 0),
  is_active: Number(row.is_active || 0) === 1,
});

const ensureInventoryTables = async () => {
  if (initialized) return;

  if (engine === "sqlite") {
    await query(`
      CREATE TABLE IF NOT EXISTS medicine_inventory (
        medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        generic_name TEXT,
        category TEXT,
        batch_number TEXT,
        supplier_name TEXT,
        unit_price REAL DEFAULT 0,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 10,
        expiry_date TEXT,
        last_restocked_at TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(
      "CREATE INDEX IF NOT EXISTS idx_medicine_inventory_name ON medicine_inventory(name)",
    );
    await query(
      "CREATE INDEX IF NOT EXISTS idx_medicine_inventory_expiry ON medicine_inventory(expiry_date)",
    );
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS medicine_inventory (
        medicine_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(140) NOT NULL,
        generic_name VARCHAR(140),
        category VARCHAR(100),
        batch_number VARCHAR(80),
        supplier_name VARCHAR(140),
        unit_price DECIMAL(10, 2) DEFAULT 0,
        stock_quantity INT NOT NULL DEFAULT 0,
        reorder_level INT NOT NULL DEFAULT 10,
        expiry_date DATE NULL,
        last_restocked_at DATETIME NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_medicine_inventory_name (name),
        INDEX idx_medicine_inventory_expiry (expiry_date)
      )
    `);
  }

  initialized = true;
};

const getAllActiveMedicines = async () => {
  await ensureInventoryTables();

  const rows = await query(
    `
    SELECT
      medicine_id,
      name,
      generic_name,
      category,
      batch_number,
      supplier_name,
      unit_price,
      stock_quantity,
      expiry_date,
      last_restocked_at,
      is_active,
      created_at,
      updated_at
    FROM medicine_inventory
    WHERE is_active = 1
    ORDER BY name ASC
    `,
  );

  return rows.map(normalizeMedicine);
};

exports.listMedicines = async (req, res) => {
  try {
    const search = String(req.query.search || "")
      .trim()
      .toLowerCase();
    let medicines = await getAllActiveMedicines();

    if (search) {
      medicines = medicines.filter((item) => {
        const hay = [
          item.name,
          item.generic_name,
          item.category,
          item.batch_number,
          item.supplier_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }

    return res.json({
      success: true,
      count: medicines.length,
      medicines,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load medicine inventory",
      error: error.message,
    });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const expiryWindowDays = Math.min(
      180,
      Math.max(1, toInt(req.query.expiryWindowDays, 30)),
    );

    const medicines = await getAllActiveMedicines();

    const lowStock = medicines.filter(
      (item) => item.stock_quantity <= LOW_STOCK_BOX_THRESHOLD,
    );

    const expiringSoon = medicines.filter((item) => {
      if (!item.expiry_date) return false;
      const days = daysBetweenToday(item.expiry_date);
      return days >= 0 && days <= expiryWindowDays;
    });

    const expired = medicines.filter((item) => {
      if (!item.expiry_date) return false;
      return daysBetweenToday(item.expiry_date) < 0;
    });

    return res.json({
      success: true,
      expiryWindowDays,
      lowStockBoxThreshold: LOW_STOCK_BOX_THRESHOLD,
      alerts: {
        lowStock,
        expiringSoon,
        expired,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load inventory alerts",
      error: error.message,
    });
  }
};

exports.getSummary = async (_req, res) => {
  try {
    const medicines = await getAllActiveMedicines();

    const lowStockCount = medicines.filter(
      (item) => item.stock_quantity <= LOW_STOCK_BOX_THRESHOLD,
    ).length;

    const expiringSoonCount = medicines.filter((item) => {
      if (!item.expiry_date) return false;
      const days = daysBetweenToday(item.expiry_date);
      return days >= 0 && days <= 30;
    }).length;

    const expiredCount = medicines.filter((item) => {
      if (!item.expiry_date) return false;
      return daysBetweenToday(item.expiry_date) < 0;
    }).length;

    const totalStockUnits = medicines.reduce(
      (sum, item) => sum + item.stock_quantity,
      0,
    );

    return res.json({
      success: true,
      summary: {
        totalMedicines: medicines.length,
        totalStockUnits,
        lowStockBoxThreshold: LOW_STOCK_BOX_THRESHOLD,
        lowStockCount,
        expiringSoonCount,
        expiredCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load inventory summary",
      error: error.message,
    });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    await ensureInventoryTables();

    const name = String(req.body.name || "").trim();
    const genericName = String(req.body.genericName || "").trim() || null;
    const category = String(req.body.category || "").trim() || null;
    const batchNumber = String(req.body.batchNumber || "").trim() || null;
    const supplierName = String(req.body.supplierName || "").trim() || null;
    const stockQuantity = Math.max(0, toInt(req.body.stockQuantity, 0));
    const unitPrice = Math.max(0, toFloat(req.body.unitPrice, 0));
    const expiryDate = sanitizeDateInput(req.body.expiryDate);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Medicine name is required",
      });
    }

    const result = await query(
      `
      INSERT INTO medicine_inventory (
        name,
        generic_name,
        category,
        batch_number,
        supplier_name,
        unit_price,
        stock_quantity,
        expiry_date,
        last_restocked_at,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `,
      [
        name,
        genericName,
        category,
        batchNumber,
        supplierName,
        unitPrice,
        stockQuantity,
        expiryDate,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Medicine added successfully",
      medicineId: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create medicine",
      error: error.message,
    });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    await ensureInventoryTables();

    const medicineId = toInt(req.params.medicineId, 0);
    if (!medicineId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid medicineId" });
    }

    const name = String(req.body.name || "").trim();
    const genericName = String(req.body.genericName || "").trim() || null;
    const category = String(req.body.category || "").trim() || null;
    const batchNumber = String(req.body.batchNumber || "").trim() || null;
    const supplierName = String(req.body.supplierName || "").trim() || null;
    const unitPrice = Math.max(0, toFloat(req.body.unitPrice, 0));
    const expiryDate = sanitizeDateInput(req.body.expiryDate);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Medicine name is required",
      });
    }

    const result = await query(
      `
      UPDATE medicine_inventory
      SET name = ?,
          generic_name = ?,
          category = ?,
          batch_number = ?,
          supplier_name = ?,
          unit_price = ?,
          expiry_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE medicine_id = ?
        AND is_active = 1
      `,
      [
        name,
        genericName,
        category,
        batchNumber,
        supplierName,
        unitPrice,
        expiryDate,
        medicineId,
      ],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    return res.json({
      success: true,
      message: "Medicine updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update medicine",
      error: error.message,
    });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    await ensureInventoryTables();

    const medicineId = toInt(req.params.medicineId, 0);
    const adjustment = toInt(req.body.adjustment, 0);

    if (!medicineId || adjustment === 0) {
      return res.status(400).json({
        success: false,
        message: "medicineId and non-zero adjustment are required",
      });
    }

    const rows = await query(
      `
      SELECT stock_quantity
      FROM medicine_inventory
      WHERE medicine_id = ?
        AND is_active = 1
      LIMIT 1
      `,
      [medicineId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const currentStock = toInt(rows[0].stock_quantity, 0);
    const nextStock = currentStock + adjustment;

    if (nextStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock adjustment would make quantity negative",
      });
    }

    await query(
      `
      UPDATE medicine_inventory
      SET stock_quantity = ?,
          last_restocked_at = CASE WHEN ? > 0 THEN CURRENT_TIMESTAMP ELSE last_restocked_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE medicine_id = ?
      `,
      [nextStock, adjustment, medicineId],
    );

    return res.json({
      success: true,
      message: "Stock updated successfully",
      stockQuantity: nextStock,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to adjust stock",
      error: error.message,
    });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    await ensureInventoryTables();

    const medicineId = toInt(req.params.medicineId, 0);
    if (!medicineId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid medicineId" });
    }

    const result = await query(
      `
      DELETE FROM medicine_inventory
      WHERE medicine_id = ?
      `,
      [medicineId],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    return res.json({
      success: true,
      message: "Medicine deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete medicine",
      error: error.message,
    });
  }
};
