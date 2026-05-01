const { query } = require("../config/database");
const {
  ensurePrescriptionSchema,
} = require("../services/prescriptionSchema");
const { createPortalNotification } = require("../utils/notificationService");
const { sendEmail } = require("../utils/emailService");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const toIntegerId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
};

const generatePrescriptionNumber = () => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RX-${datePart}-${randomPart}`;
};

const createUniquePrescriptionNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generatePrescriptionNumber();
    const rows = await query(
      "SELECT prescription_id FROM prescription_records WHERE prescription_number = ? LIMIT 1",
      [candidate],
    );
    if (rows.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not generate unique prescription number");
};

const formatDoctorName = (name) => {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "Your doctor";
  return /^dr\.?\s/i.test(cleanName) ? cleanName : `Dr. ${cleanName}`;
};

const canViewPrescription = (user, prescription) => {
  if (!user || !prescription) return false;
  if (user.role === "admin") return true;
  if (user.role === "doctor") {
    return Number(user.doctorId) === Number(prescription.doctor_id);
  }
  if (user.role === "patient") {
    return Number(user.userId) === Number(prescription.patient_user_id);
  }
  return false;
};

const getPrescriptionWithItems = async (prescriptionId) => {
  const rows = await query(
    `
    SELECT
      p.*,
      u.full_name AS patient_name,
      u.phone AS patient_phone,
      u.email AS patient_email,
      d.name AS doctor_name,
      d.specialization AS doctor_specialization,
      d.department AS doctor_department,
      a.appointment_date,
      a.appointment_time
    FROM prescription_records p
    JOIN users u ON u.user_id = p.patient_user_id
    JOIN doctors d ON d.doctor_id = p.doctor_id
    LEFT JOIN appointments a ON a.appointment_id = p.appointment_id
    WHERE p.prescription_id = ?
    LIMIT 1
    `,
    [prescriptionId],
  );

  if (rows.length === 0) {
    return null;
  }

  const itemRows = await query(
    `
    SELECT
      prescription_item_id,
      medicine_name,
      dosage,
      frequency,
      duration,
      instructions
    FROM prescription_items
    WHERE prescription_id = ?
    ORDER BY prescription_item_id ASC
    `,
    [prescriptionId],
  );

  return {
    ...rows[0],
    items: itemRows,
  };
};

const notifyPrescriptionCreated = async (prescription) => {
  let portalStatus = "skipped";
  let portalWarning = null;
  const doctorName = formatDoctorName(prescription?.doctor_name);

  if (prescription?.patient_user_id) {
    try {
      const notificationId = await createPortalNotification({
        userId: prescription.patient_user_id,
        appointmentId: prescription.appointment_id || null,
        relatedEntityType: "prescription",
        relatedEntityId: prescription.prescription_id,
        recipientRole: "patient",
        eventType: "prescription",
        title: "New Prescription Available",
        message: `${doctorName} has issued a new prescription for you.`,
        metadata: {
          type: "prescription",
          prescriptionId: prescription.prescription_id,
          prescriptionNumber: prescription.prescription_number,
          relatedEntityType: "prescription",
          relatedEntityId: prescription.prescription_id,
          appointmentId: prescription.appointment_id || null,
          doctorId: prescription.doctor_id,
          doctorName: prescription.doctor_name,
          diagnosis: prescription.diagnosis || null,
        },
        dedupeKey: [
          "prescription",
          prescription.prescription_id,
          "patient",
          prescription.patient_user_id,
          "portal",
        ].join(":"),
      });
      portalStatus = notificationId ? "sent" : "duplicate";
    } catch (error) {
      portalStatus = "failed";
      portalWarning =
        "Prescription created, but the patient portal notification could not be created.";
      console.error(
        `Portal notification failed for prescription ${prescription.prescription_id}:`,
        error.message,
      );
    }
  }

  try {
    if (!prescription?.patient_email) {
      return {
        notificationResult: {
          portalStatus,
          emailStatus: "skipped",
          reason: "Patient email is not available",
        },
        notificationWarning: portalWarning,
      };
    }

    const emailResult = await sendEmail({
      to: prescription.patient_email,
      subject: `Prescription ${prescription.prescription_number} created`,
      title: "New prescription generated",
      message: `Your prescription ${prescription.prescription_number} has been generated.`,
      details: [
        { label: "Prescription Number", value: prescription.prescription_number },
        { label: "Doctor", value: prescription.doctor_name || "-" },
        { label: "Diagnosis", value: prescription.diagnosis || "-" },
        { label: "Medicines", value: String(prescription.items?.length || 0) },
      ],
    });

    const warning =
      emailResult.status === "sent"
        ? null
        : `Prescription created, but patient email notification was ${emailResult.status}.`;

    return {
      notificationResult: {
        portalStatus,
        emailStatus: emailResult.status,
        provider: emailResult.provider || null,
        externalId: emailResult.externalId || null,
        reason: emailResult.reason || null,
      },
      notificationWarning: portalWarning || warning,
    };
  } catch (error) {
    return {
      notificationResult: {
        portalStatus,
        emailStatus: "failed",
      },
      notificationWarning:
        portalWarning ||
        "Prescription created, but patient email notification could not be processed.",
    };
  }
};

const createPrescription = async (req, res) => {
  try {
    await ensurePrescriptionSchema();

    const {
      patientId,
      doctorId: doctorIdInput,
      appointmentId,
      visitId,
      diagnosis,
      notes,
      advice,
      items,
    } = req.body;

    const patientUserId = toIntegerId(patientId);
    const appointment = toIntegerId(appointmentId);
    const visit = visitId ? toIntegerId(visitId) : null;
    const doctorIdFromBody = toIntegerId(doctorIdInput);

    if (!patientUserId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one medicine item is required",
      });
    }

    let doctorId = doctorIdFromBody;
    if (req.user.role === "doctor") {
      doctorId = toIntegerId(req.user.doctorId);
      if (!doctorId) {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not linked to a doctor profile",
        });
      }
    }

    let appointmentRow = null;
    if (appointment) {
      const appointmentRows = await query(
        `
        SELECT appointment_id, patient_user_id, doctor_id
        FROM appointments
        WHERE appointment_id = ?
        LIMIT 1
        `,
        [appointment],
      );

      if (appointmentRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      appointmentRow = appointmentRows[0];
      if (Number(appointmentRow.patient_user_id) !== Number(patientUserId)) {
        return res.status(400).json({
          success: false,
          message: "Appointment does not match the provided patientId",
        });
      }

      if (!doctorId) {
        doctorId = toIntegerId(appointmentRow.doctor_id);
      }
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message:
          "doctorId is required (or provide a valid appointmentId to infer doctor)",
      });
    }

    const patientRows = await query(
      "SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1",
      [patientUserId],
    );
    if (patientRows.length === 0 || patientRows[0].role !== "patient") {
      return res.status(404).json({
        success: false,
        message: "Patient account not found",
      });
    }

    const doctorRows = await query(
      "SELECT doctor_id FROM doctors WHERE doctor_id = ? LIMIT 1",
      [doctorId],
    );
    if (doctorRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (
      appointmentRow &&
      Number(appointmentRow.doctor_id) !== Number(doctorId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Appointment does not match the provided patientId and doctorId",
      });
    }

    const cleanItems = items.map((item) => ({
      medicineName: String(item.medicineName || "").trim(),
      dosage: String(item.dosage || "").trim(),
      frequency: String(item.frequency || "").trim(),
      duration: String(item.duration || "").trim(),
      instructions: item.instructions
        ? String(item.instructions).trim()
        : null,
    }));

    const hasInvalidItem = cleanItems.some(
      (item) =>
        !item.medicineName || !item.dosage || !item.frequency || !item.duration,
    );
    if (hasInvalidItem) {
      return res.status(400).json({
        success: false,
        message:
          "Each medicine item requires medicineName, dosage, frequency, and duration",
      });
    }

    const prescriptionNumber = await createUniquePrescriptionNumber();
    const insertResult = await query(
      `
      INSERT INTO prescription_records (
        prescription_number,
        patient_user_id,
        doctor_id,
        appointment_id,
        visit_id,
        diagnosis,
        notes,
        advice
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        prescriptionNumber,
        patientUserId,
        doctorId,
        appointment || null,
        visit || null,
        diagnosis ? String(diagnosis).trim() : null,
        notes ? String(notes).trim() : null,
        advice ? String(advice).trim() : null,
      ],
    );

    const prescriptionId = insertResult.insertId;
    for (const item of cleanItems) {
      await query(
        `
        INSERT INTO prescription_items (
          prescription_id,
          medicine_name,
          dosage,
          frequency,
          duration,
          instructions
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          prescriptionId,
          item.medicineName,
          item.dosage,
          item.frequency,
          item.duration,
          item.instructions,
        ],
      );
    }

    const prescription = await getPrescriptionWithItems(prescriptionId);
    const { notificationResult, notificationWarning } =
      await notifyPrescriptionCreated(prescription);

    return res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      prescription,
      notificationResult,
      notificationWarning,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create prescription",
      error: error.message,
    });
  }
};

const getPrescriptionById = async (req, res) => {
  try {
    await ensurePrescriptionSchema();

    const prescriptionId = toIntegerId(req.params.prescriptionId);
    if (!prescriptionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription id",
      });
    }

    const prescription = await getPrescriptionWithItems(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    if (!canViewPrescription(req.user, prescription)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    return res.json({
      success: true,
      prescription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load prescription",
      error: error.message,
    });
  }
};

const getPatientPrescriptionHistory = async (req, res) => {
  try {
    await ensurePrescriptionSchema();

    const patientId = toIntegerId(req.params.patientId);
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient id",
      });
    }

    if (req.user.role === "patient" && Number(req.user.userId) !== patientId) {
      return res.status(403).json({
        success: false,
        message: "You can view only your own prescriptions",
      });
    }

    let sql = `
      SELECT
        p.prescription_id,
        p.prescription_number,
        p.patient_user_id,
        p.doctor_id,
        p.appointment_id,
        p.visit_id,
        p.diagnosis,
        p.notes,
        p.advice,
        p.created_at,
        d.name AS doctor_name,
        d.specialization AS doctor_specialization
      FROM prescription_records p
      JOIN doctors d ON d.doctor_id = p.doctor_id
      WHERE p.patient_user_id = ?
    `;
    const params = [patientId];

    if (req.user.role === "doctor") {
      const doctorId = toIntegerId(req.user.doctorId);
      if (!doctorId) {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not linked to a doctor profile",
        });
      }
      sql += " AND p.doctor_id = ?";
      params.push(doctorId);
    }

    sql += " ORDER BY p.created_at DESC";

    const rows = await query(sql, params);
    return res.json({
      success: true,
      count: rows.length,
      prescriptions: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load prescription history",
      error: error.message,
    });
  }
};

const getDoctorPrescriptionSummary = async (req, res) => {
  try {
    await ensurePrescriptionSchema();

    let doctorId = toIntegerId(req.params.doctorId);

    if (req.user.role === "doctor") {
      doctorId = toIntegerId(req.user.doctorId);
      if (!doctorId) {
        return res.status(403).json({
          success: false,
          message: "Doctor account is not linked to a doctor profile",
        });
      }
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor id",
      });
    }

    const doctorRows = await query(
      "SELECT doctor_id FROM doctors WHERE doctor_id = ? LIMIT 1",
      [doctorId],
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const summaryRows = await query(
      `
      SELECT
        COUNT(*) AS total_prescriptions,
        COUNT(DISTINCT patient_user_id) AS unique_patients,
        MAX(created_at) AS latest_prescription_at
      FROM prescription_records
      WHERE doctor_id = ?
      `,
      [doctorId],
    );

    return res.json({
      success: true,
      summary: {
        doctorId,
        totalPrescriptions: Number(
          summaryRows[0]?.total_prescriptions || 0,
        ),
        uniquePatients: Number(summaryRows[0]?.unique_patients || 0),
        latestPrescriptionAt: summaryRows[0]?.latest_prescription_at || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load doctor prescription summary",
      error: error.message,
    });
  }
};

const buildPrescriptionPrintHtml = (prescription) => {
  const itemsHtml = prescription.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.medicine_name)}</td>
        <td>${escapeHtml(item.dosage)}</td>
        <td>${escapeHtml(item.frequency)}</td>
        <td>${escapeHtml(item.duration)}</td>
        <td>${escapeHtml(item.instructions || "-")}</td>
      </tr>
      `,
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Prescription ${escapeHtml(prescription.prescription_number)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
        .row { display: flex; justify-content: space-between; gap: 16px; }
        h1 { margin: 0 0 8px; }
        .muted { color: #6b7280; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f9fafb; }
        @media print { button { display: none; } body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="row">
        <div>
          <h1>MediAI SmartCare</h1>
          <div class="muted">Prescription</div>
        </div>
        <div style="text-align:right;">
          <div><strong>Prescription #:</strong> ${escapeHtml(prescription.prescription_number)}</div>
          <div><strong>Date:</strong> ${escapeHtml(String(prescription.created_at || "").slice(0, 19))}</div>
        </div>
      </div>

      <div class="row" style="margin-top:16px;">
        <div>
          <div><strong>Patient:</strong> ${escapeHtml(prescription.patient_name)}</div>
          <div class="muted">Phone: ${escapeHtml(prescription.patient_phone || "-")} | Email: ${escapeHtml(prescription.patient_email || "-")}</div>
        </div>
        <div>
          <div><strong>Doctor:</strong> ${escapeHtml(prescription.doctor_name)}</div>
          <div class="muted">${escapeHtml(prescription.doctor_specialization || "-")} (${escapeHtml(prescription.doctor_department || "-")})</div>
        </div>
      </div>

      <div style="margin-top:16px;">
        <strong>Diagnosis:</strong> ${escapeHtml(prescription.diagnosis || "-")}<br />
        <strong>Advice:</strong> ${escapeHtml(prescription.advice || "-")}<br />
        <strong>Notes:</strong> ${escapeHtml(prescription.notes || "-")}
      </div>

      <table>
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Duration</th>
            <th>Instructions</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="margin-top:28px;">
        <div>Doctor Signature: __________________________</div>
      </div>
      <button onclick="window.print()" style="margin-top: 16px;">Print Prescription</button>
    </body>
  </html>
  `;
};

const printPrescription = async (req, res) => {
  try {
    await ensurePrescriptionSchema();

    const prescriptionId = toIntegerId(req.params.prescriptionId);
    if (!prescriptionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription id",
      });
    }

    const prescription = await getPrescriptionWithItems(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    if (!canViewPrescription(req.user, prescription)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildPrescriptionPrintHtml(prescription));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to render prescription",
      error: error.message,
    });
  }
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getPatientPrescriptionHistory,
  getDoctorPrescriptionSummary,
  printPrescription,
};
