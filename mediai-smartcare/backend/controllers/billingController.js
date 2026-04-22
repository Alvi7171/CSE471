/**
 * Billing & Payment Tracking Controller
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 * Purpose: Manage invoices, payments, and billing analytics
 */

const { db } = require("../config/database");

/**
 * Generate invoice from appointment
 * Creates an invoice with line items based on consultation and other charges
 */
const generateInvoice = (appointmentId, patientUserId) => {
  try {
    // Get appointment details
    const appointmentQuery = `
      SELECT a.*, d.consultation_fee, d.name as doctor_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.appointment_id = ?
    `;
    const appointment = db.prepare(appointmentQuery).get(appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${appointmentId}`;
    const invoiceDate = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Calculate amounts
    const consultationFee = appointment.consultation_fee || 0;
    const subtotal = consultationFee;
    const taxAmount = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
    const discountAmount = 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Insert invoice
    const invoiceStmt = db.prepare(`
      INSERT INTO invoices (
        patient_user_id, appointment_id, invoice_number, invoice_date, due_date,
        subtotal, tax_amount, discount_amount, total_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued')
    `);

    const invoiceResult = invoiceStmt.run(
      patientUserId,
      appointmentId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      consultationFee,
      taxAmount,
      discountAmount,
      totalAmount,
    );

    const invoiceId = invoiceResult.lastInsertRowid;

    // Insert line item for consultation
    const lineItemStmt = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, description, item_type, quantity, unit_price, total_price
      ) VALUES (?, ?, 'consultation', 1, ?, ?)
    `);

    lineItemStmt.run(
      invoiceId,
      `Consultation with ${appointment.doctor_name}`,
      consultationFee,
      consultationFee,
    );

    return {
      invoiceId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      status: "issued",
    };
  } catch (error) {
    console.error("Error generating invoice:", error);
    throw error;
  }
};

/**
 * Get invoice details with line items
 */
const getInvoice = (invoiceId) => {
  try {
    const invoiceQuery = `
      SELECT i.*, u.full_name, u.email, u.phone, u.address
      FROM invoices i
      LEFT JOIN users u ON i.patient_user_id = u.user_id
      WHERE i.invoice_id = ?
    `;
    const invoice = db.prepare(invoiceQuery).get(invoiceId);

    if (!invoice) {
      return null;
    }

    const itemsQuery = `
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `;
    const items = db.prepare(itemsQuery).all(invoiceId);

    return {
      ...invoice,
      items,
    };
  } catch (error) {
    console.error("Error getting invoice:", error);
    throw error;
  }
};

/**
 * Get all invoices for a patient
 */
const getPatientInvoices = (patientUserId) => {
  try {
    const query = `
      SELECT * FROM invoices
      WHERE patient_user_id = ?
      ORDER BY invoice_date DESC
    `;
    return db.prepare(query).all(patientUserId);
  } catch (error) {
    console.error("Error getting patient invoices:", error);
    throw error;
  }
};

/**
 * Record a payment for an invoice
 */
const recordPayment = (
  invoiceId,
  patientUserId,
  amount,
  paymentMethod,
  transactionId,
) => {
  try {
    const paymentDate = new Date().toISOString().split("T")[0];
    const paymentTime = new Date().toISOString().split("T")[1].slice(0, 8);

    // Insert payment
    const paymentStmt = db.prepare(`
      INSERT INTO payments (
        invoice_id, patient_user_id, payment_date, payment_time, amount,
        payment_method, transaction_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
    `);

    const result = paymentStmt.run(
      invoiceId,
      patientUserId,
      paymentDate,
      paymentTime,
      amount,
      paymentMethod,
      transactionId,
    );

    // Update invoice status
    const invoiceQuery = `
      SELECT total_amount FROM invoices WHERE invoice_id = ?
    `;
    const invoice = db.prepare(invoiceQuery).get(invoiceId);

    const totalPaymentsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM payments WHERE invoice_id = ? AND status = 'completed'
    `;
    const paymentSum = db.prepare(totalPaymentsQuery).get(invoiceId);

    let invoiceStatus = "pending";
    if (paymentSum.total_paid >= invoice.total_amount) {
      invoiceStatus = "paid";
    } else if (paymentSum.total_paid > 0) {
      invoiceStatus = "partially_paid";
    }

    const updateStmt = db.prepare(`
      UPDATE invoices SET status = ? WHERE invoice_id = ?
    `);
    updateStmt.run(invoiceStatus, invoiceId);

    return {
      paymentId: result.lastInsertRowid,
      status: "completed",
      amount,
      paymentMethod,
    };
  } catch (error) {
    console.error("Error recording payment:", error);
    throw error;
  }
};

/**
 * Get payment history for an invoice
 */
const getInvoicePayments = (invoiceId) => {
  try {
    const query = `
      SELECT * FROM payments
      WHERE invoice_id = ?
      ORDER BY payment_date DESC
    `;
    return db.prepare(query).all(invoiceId);
  } catch (error) {
    console.error("Error getting invoice payments:", error);
    throw error;
  }
};

/**
 * Get billing analytics for dashboard
 */
const getBillingAnalytics = (startDate, endDate) => {
  try {
    // Total revenue
    const totalRevenueQuery = `
      SELECT 
        COUNT(DISTINCT i.invoice_id) as total_invoices,
        COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.invoice_id END) as paid_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(i.total_amount), 0) as total_billed,
        COALESCE(SUM(CASE WHEN i.status IN ('pending', 'partially_paid', 'overdue') THEN i.total_amount - COALESCE((SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.invoice_id AND status = 'completed'), 0) ELSE 0 END), 0) as outstanding_amount
      FROM invoices i
      WHERE 1=1
    `;

    const params = [];
    let query = totalRevenueQuery;

    if (startDate && endDate) {
      query += " AND DATE(i.invoice_date) >= ? AND DATE(i.invoice_date) <= ?";
      params.push(startDate, endDate);
    }

    const revenue = db.prepare(query).get(...params);

    // Payment method breakdown
    const paymentMethodQuery = `
      SELECT 
        p.payment_method,
        COUNT(DISTINCT p.payment_id) as payment_count,
        COALESCE(SUM(p.amount), 0) as total_amount
      FROM payments p
      WHERE 1=1
    `;

    let pmQuery = paymentMethodQuery;
    const pmParams = [];

    if (startDate && endDate) {
      pmQuery += " AND DATE(p.payment_date) >= ? AND DATE(p.payment_date) <= ?";
      pmParams.push(startDate, endDate);
    }

    pmQuery += " GROUP BY p.payment_method ORDER BY total_amount DESC";

    const paymentMethods = db.prepare(pmQuery).all(...pmParams);

    // Invoices by status
    const statusQuery = `
      SELECT 
        i.status,
        COUNT(DISTINCT i.invoice_id) as count,
        COALESCE(SUM(i.total_amount), 0) as total_amount
      FROM invoices i
      WHERE 1=1
    `;

    let statusQry = statusQuery;
    const statusParams = [];

    if (startDate && endDate) {
      statusQry +=
        " AND DATE(i.invoice_date) >= ? AND DATE(i.invoice_date) <= ?";
      statusParams.push(startDate, endDate);
    }

    statusQry += " GROUP BY i.status";

    const byStatus = db.prepare(statusQry).all(...statusParams);

    return {
      revenue,
      paymentMethods,
      byStatus,
    };
  } catch (error) {
    console.error("Error getting billing analytics:", error);
    throw error;
  }
};

module.exports = {
  generateInvoice,
  getInvoice,
  getPatientInvoices,
  recordPayment,
  getInvoicePayments,
  getBillingAnalytics,
};
