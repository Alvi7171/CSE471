/**
 * Billing & Payment Tracking Routes
 * API endpoints for invoice management and payment processing
 */

const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * POST /api/billing/generate-invoice
 * Generate an invoice from an appointment
 */
router.post("/generate-invoice", authMiddleware, (req, res) => {
  try {
    const { appointmentId, patientUserId } = req.body;

    if (!appointmentId || !patientUserId) {
      return res.status(400).json({
        success: false,
        message: "appointmentId and patientUserId are required",
      });
    }

    const invoice = billingController.generateInvoice(
      appointmentId,
      patientUserId,
    );

    res.status(201).json({
      success: true,
      data: invoice,
      message: "Invoice generated successfully",
    });
  } catch (error) {
    console.error("Error in generate-invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/billing/invoice/:invoiceId
 * Get invoice details with line items
 */
router.get("/invoice/:invoiceId", authMiddleware, (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = billingController.getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error in get-invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/billing/patient/:patientUserId/invoices
 * Get all invoices for a patient
 */
router.get("/patient/:patientUserId/invoices", authMiddleware, (req, res) => {
  try {
    const { patientUserId } = req.params;

    const invoices = billingController.getPatientInvoices(patientUserId);

    res.json({
      success: true,
      data: invoices,
      count: invoices.length,
    });
  } catch (error) {
    console.error("Error getting patient invoices:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/billing/payment
 * Record a payment for an invoice
 */
router.post("/payment", authMiddleware, (req, res) => {
  try {
    const { invoiceId, patientUserId, amount, paymentMethod, transactionId } =
      req.body;

    if (!invoiceId || !patientUserId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message:
          "invoiceId, patientUserId, amount, and paymentMethod are required",
      });
    }

    const payment = billingController.recordPayment(
      invoiceId,
      patientUserId,
      amount,
      paymentMethod,
      transactionId,
    );

    res.status(201).json({
      success: true,
      data: payment,
      message: "Payment recorded successfully",
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/billing/invoice/:invoiceId/payments
 * Get payment history for an invoice
 */
router.get("/invoice/:invoiceId/payments", authMiddleware, (req, res) => {
  try {
    const { invoiceId } = req.params;

    const payments = billingController.getInvoicePayments(invoiceId);

    res.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Error getting invoice payments:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/billing/analytics
 * Get billing analytics for dashboard
 */
router.get("/analytics", authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = billingController.getBillingAnalytics(startDate, endDate);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error getting billing analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
