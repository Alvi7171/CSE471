const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { query } = require("../config/database");

router.use(requireAuth, requireRole("admin"));

router.get("/dashboard", async (req, res) => {
  return res.json({
    success: true,
    message: "Admin dashboard endpoint ready for future tasks",
    todo: [
      "User management",
      "Doctor onboarding",
      "Analytics and reporting",
      "Appointment moderation",
    ],
  });
});

router.delete("/doctors/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const existing = await query(
      "SELECT doctor_id FROM doctors WHERE doctor_id = ? LIMIT 1",
      [doctorId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    await query("UPDATE doctors SET is_available = 0 WHERE doctor_id = ?", [
      doctorId,
    ]);

    return res.json({
      success: true,
      message: "Doctor removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove doctor",
      error: error.message,
    });
  }
});

module.exports = router;
