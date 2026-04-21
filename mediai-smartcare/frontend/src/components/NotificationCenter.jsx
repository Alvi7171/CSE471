import React, { useEffect, useMemo, useRef, useState } from "react";
import { notificationAPI } from "../services/api";

const POLL_INTERVAL_MS = 30000;

const formatTimestamp = (value) => {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const eventStyles = {
  confirmation: "bg-emerald-100 text-emerald-700",
  reminder: "bg-amber-100 text-amber-700",
  cancellation: "bg-rose-100 text-rose-700",
  update: "bg-sky-100 text-sky-700",
};

function NotificationCenter() {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const unreadLabel = useMemo(
    () => (unreadCount > 99 ? "99+" : String(unreadCount)),
    [unreadCount],
  );

  const loadUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (_error) {
      // Keep badge stale rather than surfacing polling noise.
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await notificationAPI.list(20);
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (apiError) {
      setError(
        apiError.response?.data?.message || "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await notificationAPI.getPreferences();
      setPreferences(response.preferences || null);
    } catch (_error) {
      // Preferences remain optional in the UI.
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadNotifications();
    loadPreferences();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.notification_id === notificationId
            ? {
                ...notification,
                status: "read",
                read_at: new Date().toISOString(),
              }
            : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (_error) {
      setError("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          status: "read",
          read_at: notification.read_at || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (_error) {
      setError("Failed to mark all notifications as read");
    }
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSavingPreferences(true);
    setError("");
    try {
      const response = await notificationAPI.updatePreferences(preferences);
      setPreferences(response.preferences);
    } catch (apiError) {
      setError(
        apiError.response?.data?.message ||
          "Failed to update notification preferences",
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative px-4 py-2 rounded-lg border border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white transition-colors"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-semibold flex items-center justify-center">
            {unreadLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[80] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Notification Center
              </h3>
              <p className="text-xs text-slate-500">
                Portal alerts for appointments and reminders
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings((current) => !current)}
              className="text-xs text-theme-primary font-medium"
            >
              {showSettings ? "Hide settings" : "Settings"}
            </button>
          </div>

          {showSettings && preferences && (
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="space-y-3 text-sm text-slate-700">
                <label className="flex items-center justify-between gap-3">
                  <span>Email notifications</span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.emailEnabled)}
                    onChange={(event) =>
                      handlePreferenceChange("emailEnabled", event.target.checked)
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Portal notifications</span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.portalEnabled)}
                    onChange={(event) =>
                      handlePreferenceChange(
                        "portalEnabled",
                        event.target.checked,
                      )
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Reminder alerts</span>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.reminderEnabled)}
                    onChange={(event) =>
                      handlePreferenceChange(
                        "reminderEnabled",
                        event.target.checked,
                      )
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Reminder lead time</span>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={preferences.reminderHoursBefore || 24}
                    onChange={(event) =>
                      handlePreferenceChange(
                        "reminderHoursBefore",
                        Number(event.target.value),
                      )
                    }
                    className="w-24 px-3 py-1 rounded-lg border border-slate-300"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="mt-3 w-full py-2 rounded-lg bg-theme-primary text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingPreferences ? "Saving..." : "Save preferences"}
              </button>
            </div>
          )}

          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-xs text-theme-primary font-medium disabled:opacity-50"
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-sm text-slate-500 text-center">
                Loading notifications...
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-sm text-rose-600">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500 text-center">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`px-4 py-4 border-b border-slate-100 ${
                    notification.status === "sent" ? "bg-amber-50/40" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                            eventStyles[notification.event_type] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {notification.event_type}
                        </span>
                        {notification.status === "sent" && (
                          <span className="text-[11px] font-semibold text-amber-700">
                            New
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {notification.title}
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTimestamp(
                        notification.sent_at || notification.created_at,
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-6">
                    {notification.message}
                  </p>
                  {notification.metadata?.appointmentDate &&
                    notification.metadata?.appointmentTime && (
                      <p className="text-xs text-slate-500 mt-2">
                        {notification.metadata.appointmentDate} at{" "}
                        {String(notification.metadata.appointmentTime).slice(0, 5)}
                      </p>
                    )}
                  {notification.status === "sent" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleMarkAsRead(notification.notification_id)
                      }
                      className="mt-3 text-xs text-theme-primary font-medium"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
