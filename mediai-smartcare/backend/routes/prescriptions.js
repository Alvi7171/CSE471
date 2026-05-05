const express = require("express");
const router = express.Router();
const prescriptionController = require("../controllers/prescriptionController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

router.post(
  "/",
  requireAuth,
  requireRole("doctor", "admin"),
  prescriptionController.createPrescription,
);

router.get(
  "/patient/:patientId",
  requireAuth,
  prescriptionController.getPatientPrescriptionHistory,
);

router.get(
  "/doctor/:doctorId/summary",
  requireAuth,
  requireRole("doctor", "admin"),
  prescriptionController.getDoctorPrescriptionSummary,
);

router.get(
  "/:prescriptionId/print",
  requireAuth,
  prescriptionController.printPrescription,
);

router.get(
  "/:prescriptionId",
  requireAuth,
  prescriptionController.getPrescriptionById,
);

module.exports = router;
