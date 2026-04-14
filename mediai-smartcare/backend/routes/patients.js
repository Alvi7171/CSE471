const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");

router.get("/", patientController.getAllPatients);
router.get("/:phone/timeline", patientController.getPatientTimeline);
router.get("/:phone/summary", patientController.getPatientSummary);

module.exports = router;
