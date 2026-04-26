const { query } = require("../config/database");
const {
  DEFAULT_PREFERENCES,
  ensureNotificationPreference,
} = require("../utils/notificationService");

const parseMetadata = (value) => {
  if (!value) return null;

  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (_error) {
    return null;
  }
};

const parseBooleanInput = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

exports.getNotifications = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const notifications = await query(
      `
      SELECT
        notification_id,
        appointment_id,
        event_type,
        title,
        message,
        status,
        sent_at,
        read_at,
        created_at,
        metadata
      FROM notifications
      WHERE user_id = ?
        AND channel = 'portal'
        AND status IN ('sent', 'read')
      ORDER BY COALESCE(sent_at, created_at) DESC
      LIMIT ${limit}
      `,
      [req.user.userId],
    );

    const unreadRows = await query(
      `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE user_id = ?
        AND channel = 'portal'
        AND status = 'sent'
      `,
      [req.user.userId],
    );

    return res.json({
      success: true,
      unreadCount: Number(unreadRows[0]?.unread_count || 0),
      notifications: notifications.map((notification) => ({
        ...notification,
        metadata: parseMetadata(notification.metadata),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load notifications",
      error: error.message,
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE user_id = ?
        AND channel = 'portal'
        AND status = 'sent'
      `,
      [req.user.userId],
    );

    return res.json({
      success: true,
      unreadCount: Number(rows[0]?.unread_count || 0),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load unread count",
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const rows = await query(
      `
      SELECT notification_id, status
      FROM notifications
      WHERE notification_id = ?
        AND user_id = ?
        AND channel = 'portal'
      LIMIT 1
      `,
      [notificationId, req.user.userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (rows[0].status !== "read") {
      await query(
        `
        UPDATE notifications
        SET status = 'read',
            read_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE notification_id = ?
        `,
        [notificationId],
      );
    }

    return res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await query(
      `
      UPDATE notifications
      SET status = 'read',
          read_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND channel = 'portal'
        AND status = 'sent'
      `,
      [req.user.userId],
    );

    return res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const preferences =
      (await ensureNotificationPreference(req.user.userId)) ||
      DEFAULT_PREFERENCES;

    return res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load notification preferences",
      error: error.message,
    });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const currentPreferences =
      (await ensureNotificationPreference(req.user.userId)) ||
      DEFAULT_PREFERENCES;

    const emailEnabled = parseBooleanInput(
      req.body.emailEnabled,
      currentPreferences.emailEnabled,
    );
    const portalEnabled = parseBooleanInput(
      req.body.portalEnabled,
      currentPreferences.portalEnabled,
    );
    const reminderEnabled = parseBooleanInput(
      req.body.reminderEnabled,
      currentPreferences.reminderEnabled,
    );
    const reminderHoursBefore =
      req.body.reminderHoursBefore === undefined
        ? currentPreferences.reminderHoursBefore
        : Number(req.body.reminderHoursBefore);

    if (
      !Number.isFinite(reminderHoursBefore) ||
      reminderHoursBefore < 1 ||
      reminderHoursBefore > 168
    ) {
      return res.status(400).json({
        success: false,
        message: "reminderHoursBefore must be between 1 and 168",
      });
    }

    await query(
      `
      UPDATE notification_preferences
      SET email_enabled = ?,
          portal_enabled = ?,
          reminder_enabled = ?,
          reminder_hours_before = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
      `,
      [
        emailEnabled ? 1 : 0,
        portalEnabled ? 1 : 0,
        reminderEnabled ? 1 : 0,
        Math.round(reminderHoursBefore),
        req.user.userId,
      ],
    );

    return res.json({
      success: true,
      message: "Notification preferences updated",
      preferences: {
        emailEnabled,
        portalEnabled,
        reminderEnabled,
        reminderHoursBefore: Math.round(reminderHoursBefore),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update notification preferences",
      error: error.message,
    });
  }
};
