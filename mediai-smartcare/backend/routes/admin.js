const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

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

module.exports = router;
