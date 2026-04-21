const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", requireAuth, notificationController.getNotifications);
router.get(
  "/unread-count",
  requireAuth,
  notificationController.getUnreadCount,
);
router.get(
  "/preferences",
  requireAuth,
  notificationController.getPreferences,
);
router.put(
  "/preferences",
  requireAuth,
  notificationController.updatePreferences,
);
router.put("/:notificationId/read", requireAuth, notificationController.markAsRead);
router.put("/read-all", requireAuth, notificationController.markAllAsRead);

module.exports = router;
