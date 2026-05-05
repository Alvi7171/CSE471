const { db, engine, query } = require("../config/database");
const { sendEmail } = require("./emailService");

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_REGEX = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const DEFAULT_REMINDER_HOURS = Math.max(
  1,
  Number(process.env.NOTIFICATION_REMINDER_HOURS_DEFAULT || 24),
);
const SCHEDULER_INTERVAL_MS = Math.max(
  30000,
  Number(process.env.NOTIFICATION_PROCESS_INTERVAL_MS || 60000),
);
const BATCH_SIZE = Math.max(
  10,
  Number(process.env.NOTIFICATION_PROCESS_BATCH_SIZE || 50),
);
const EMAIL_RECIPIENT_SCOPE = String(
  process.env.NOTIFICATION_EMAIL_RECIPIENT_SCOPE || "patient",
).toLowerCase();

const DEFAULT_PREFERENCES = {
  emailEnabled: false,
  portalEnabled: true,
  reminderEnabled: true,
  reminderHoursBefore: DEFAULT_REMINDER_HOURS,
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

let schedulerHandle = null;
let schedulerRunning = false;
let notificationSchemaReady = false;

const normalizeBoolean = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value || "").toLowerCase() === "true";

const isDuplicateError = (error) =>
  /Duplicate entry|UNIQUE constraint failed/i.test(
    String(error?.message || ""),
  );

const isMissingColumnError = (error) =>
  /no such column|Unknown column/i.test(String(error?.message || ""));

const createSqliteNotificationsTableSql = (tableName = "notifications") => `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    appointment_id INTEGER,
    related_entity_type TEXT,
    related_entity_id INTEGER,
    recipient_role TEXT NOT NULL,
    channel TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    email_address TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TEXT,
    sent_at TEXT,
    read_at TEXT,
    metadata TEXT,
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE
  );
`;

const createSqliteNotificationIndexesSql = () => `
  CREATE INDEX IF NOT EXISTS idx_notifications_user_channel_status
    ON notifications (user_id, channel, status);
  CREATE INDEX IF NOT EXISTS idx_notifications_scheduled
    ON notifications (status, scheduled_for);
  CREATE INDEX IF NOT EXISTS idx_notifications_appointment
    ON notifications (appointment_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_related_entity
    ON notifications (related_entity_type, related_entity_id);
`;

const getSqliteNotificationColumns = () =>
  db.prepare("PRAGMA table_info(notifications)").all();

const ensureSqliteNotificationSchema = () => {
  db.exec(createSqliteNotificationsTableSql());

  const columns = getSqliteNotificationColumns();
  const columnNames = new Set(columns.map((column) => column.name));
  const appointmentColumn = columns.find(
    (column) => column.name === "appointment_id",
  );

  if (!columnNames.has("related_entity_type")) {
    db.exec("ALTER TABLE notifications ADD COLUMN related_entity_type TEXT");
    columnNames.add("related_entity_type");
  }

  if (!columnNames.has("related_entity_id")) {
    db.exec("ALTER TABLE notifications ADD COLUMN related_entity_id INTEGER");
    columnNames.add("related_entity_id");
  }

  const appointmentIsRequired = Number(appointmentColumn?.notnull || 0) === 1;
  if (appointmentIsRequired) {
    const targetColumns = [
      "notification_id",
      "user_id",
      "appointment_id",
      "related_entity_type",
      "related_entity_id",
      "recipient_role",
      "channel",
      "event_type",
      "title",
      "message",
      "email_address",
      "status",
      "scheduled_for",
      "sent_at",
      "read_at",
      "metadata",
      "dedupe_key",
      "created_at",
      "updated_at",
    ];

    const refreshedColumns = new Set(
      getSqliteNotificationColumns().map((column) => column.name),
    );
    const selectColumns = targetColumns.map((column) =>
      refreshedColumns.has(column) ? column : `NULL AS ${column}`,
    );

    db.exec("PRAGMA foreign_keys = OFF;");
    try {
      db.exec("BEGIN IMMEDIATE;");
      db.exec("DROP TABLE IF EXISTS notifications_rebuild;");
      db.exec(createSqliteNotificationsTableSql("notifications_rebuild"));
      db.exec(`
        INSERT INTO notifications_rebuild (${targetColumns.join(", ")})
        SELECT ${selectColumns.join(", ")}
        FROM notifications;
      `);
      db.exec("DROP TABLE notifications;");
      db.exec("ALTER TABLE notifications_rebuild RENAME TO notifications;");
      db.exec("COMMIT;");
    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch (_rollbackError) {
        // no-op
      }
      throw error;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  }

  db.exec(createSqliteNotificationIndexesSql());
};

const mysqlColumnExists = async (tableName, columnName) => {
  const rows = await query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [tableName, columnName],
  );

  return rows.length > 0;
};

const safeMysqlSchemaQuery = async (sql) => {
  try {
    await query(sql);
  } catch (error) {
    if (
      /Duplicate column name|Duplicate key name|already exists|check that column\/key exists/i.test(
        String(error?.message || ""),
      )
    ) {
      return;
    }
    throw error;
  }
};

const ensureMysqlNotificationSchema = async () => {
  await safeMysqlSchemaQuery(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      appointment_id INT NULL,
      related_entity_type VARCHAR(60) NULL,
      related_entity_id INT NULL,
      recipient_role ENUM('patient', 'doctor', 'admin') NOT NULL,
      channel ENUM('portal', 'email') NOT NULL,
      event_type ENUM('confirmation', 'reminder', 'cancellation', 'update', 'prescription', 'appointment_rescheduled') NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      email_address VARCHAR(180) NULL,
      status ENUM('pending', 'sent', 'failed', 'read', 'skipped') DEFAULT 'pending',
      scheduled_for DATETIME NULL,
      sent_at DATETIME NULL,
      read_at DATETIME NULL,
      metadata JSON NULL,
      dedupe_key VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (appointment_id) ON DELETE CASCADE,
      UNIQUE KEY unique_notification_dedupe_key (dedupe_key),
      INDEX idx_notifications_user_channel_status (user_id, channel, status),
      INDEX idx_notifications_scheduled (status, scheduled_for),
      INDEX idx_notifications_appointment (appointment_id),
      INDEX idx_notifications_related_entity (related_entity_type, related_entity_id)
    );
  `);

  await safeMysqlSchemaQuery("ALTER TABLE notifications MODIFY appointment_id INT NULL");
  await safeMysqlSchemaQuery(`
    ALTER TABLE notifications
    MODIFY event_type ENUM('confirmation', 'reminder', 'cancellation', 'update', 'prescription', 'appointment_rescheduled') NOT NULL
  `);

  if (!(await mysqlColumnExists("notifications", "related_entity_type"))) {
    await safeMysqlSchemaQuery(
      "ALTER TABLE notifications ADD COLUMN related_entity_type VARCHAR(60) NULL AFTER appointment_id",
    );
  }

  if (!(await mysqlColumnExists("notifications", "related_entity_id"))) {
    await safeMysqlSchemaQuery(
      "ALTER TABLE notifications ADD COLUMN related_entity_id INT NULL AFTER related_entity_type",
    );
  }

  await safeMysqlSchemaQuery(
    "CREATE INDEX idx_notifications_related_entity ON notifications (related_entity_type, related_entity_id)",
  );
};

const ensureNotificationSchema = async () => {
  if (notificationSchemaReady) {
    return;
  }

  if (engine === "sqlite") {
    ensureSqliteNotificationSchema();
  } else {
    await ensureMysqlNotificationSchema();
  }

  notificationSchemaReady = true;
};

const safeJsonParse = (value, fallback = null) => {
  if (!value) return fallback;

  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (_error) {
    return fallback;
  }
};

const formatDateTimeForDb = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const formatDisplayDate = (dateString) => {
  const match = DATE_REGEX.exec(String(dateString || ""));
  if (!match) return dateString || "-";

  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  return `${MONTH_NAMES[monthIndex] || match[2]} ${day}, ${match[1]}`;
};

const formatDisplayTime = (timeString) => String(timeString || "").slice(0, 5);

const formatDoctorName = (name) => {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "your doctor";
  return /^dr\.?\s/i.test(cleanName) ? cleanName : `Dr. ${cleanName}`;
};

const combineLocalDateTime = (dateString, timeString) => {
  const dateMatch = DATE_REGEX.exec(String(dateString || ""));
  const timeMatch = TIME_REGEX.exec(String(timeString || ""));

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const date = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3] || 0),
    0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDbDateTime = (value) => {
  const match = DATETIME_REGEX.exec(String(value || ""));
  if (!match) {
    return null;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0),
    0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const sanitizeHours = (value) => {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
    return DEFAULT_REMINDER_HOURS;
  }
  return Math.round(hours);
};

const getLocationLabel = (context) =>
  context.medical_name || "MediAI SmartCare Hospital";

const shouldSendEmailToRecipient = (recipient) => {
  if (EMAIL_RECIPIENT_SCOPE === "all") {
    return true;
  }

  return recipient.role === "patient";
};

const shouldSendImmediateEmail = ({ eventType, context, recipient }) => {
  if (recipient.role !== "patient") {
    return false;
  }

  return (
    eventType === "update" &&
    String(context?.status || "").toLowerCase() === "confirmed"
  );
};

const getReminderValidity = (context) => {
  const appointmentAt = combineLocalDateTime(
    context.appointment_date,
    context.appointment_time,
  );

  if (!appointmentAt) {
    return { appointmentAt: null, sendReminder: false };
  }

  const validStatuses = ["confirmed"];
  return {
    appointmentAt,
    sendReminder:
      validStatuses.includes(String(context.status || "").toLowerCase()) &&
      appointmentAt.getTime() > Date.now(),
  };
};

const buildNotificationDetails = (context, recipientRole) => {
  const details = [
    { label: "Date", value: formatDisplayDate(context.appointment_date) },
    { label: "Time", value: formatDisplayTime(context.appointment_time) },
    { label: "Location", value: getLocationLabel(context) },
  ];

  if (recipientRole === "patient") {
    details.unshift({
      label: "Doctor",
      value: `${context.doctor_name} (${context.specialization || context.department || "Doctor"})`,
    });
  } else {
    details.unshift({
      label: "Patient",
      value: context.patient_name,
    });
  }

  return details;
};

const buildNotificationContent = (eventType, context, recipientRole) => {
  const dateLabel = formatDisplayDate(context.appointment_date);
  const timeLabel = formatDisplayTime(context.appointment_time);
  const location = getLocationLabel(context);
  const statusLabel = String(context.status || "updated").replace(
    /^./,
    (char) => char.toUpperCase(),
  );

  if (eventType === "confirmation") {
    if (recipientRole === "patient") {
      return {
        title: "Appointment booked",
        message: `Your appointment request with ${context.doctor_name} is booked for ${dateLabel} at ${timeLabel}. Current status: ${context.status}. Location: ${location}.`,
      };
    }

    return {
      title: "New appointment booked",
      message: `${context.patient_name} booked an appointment for ${dateLabel} at ${timeLabel}. Location: ${location}.`,
    };
  }

  if (eventType === "reminder") {
    if (recipientRole === "patient") {
      return {
        title: "Appointment reminder",
        message: `Reminder: you have an appointment with ${context.doctor_name} on ${dateLabel} at ${timeLabel}. Location: ${location}.`,
      };
    }

    return {
      title: "Upcoming appointment reminder",
      message: `Reminder: ${context.patient_name} is scheduled on ${dateLabel} at ${timeLabel}. Location: ${location}.`,
    };
  }

  if (eventType === "cancellation") {
    if (recipientRole === "patient") {
      if (String(context.status || "").toLowerCase() === "declined") {
        return {
          title: "Appointment request declined",
          message: `Your appointment request with ${context.doctor_name} for ${dateLabel} at ${timeLabel} has been declined.`,
        };
      }

      return {
        title: "Appointment cancelled",
        message: `Your appointment with ${context.doctor_name} on ${dateLabel} at ${timeLabel} has been cancelled.`,
      };
    }

    return {
      title: "Appointment cancelled",
      message: `The appointment with ${context.patient_name} on ${dateLabel} at ${timeLabel} has been cancelled.`,
    };
  }

  if (recipientRole === "patient") {
    return {
      title: `Appointment ${String(context.status || "updated").toLowerCase()}`,
      message: `Your appointment with ${context.doctor_name} on ${dateLabel} at ${timeLabel} is now ${String(context.status || "updated").toLowerCase()}.`,
    };
  }

  return {
    title: `Appointment ${String(context.status || "updated").toLowerCase()}`,
    message: `The appointment with ${context.patient_name} on ${dateLabel} at ${timeLabel} is now ${statusLabel}.`,
  };
};

const getAppointmentNotificationContext = async (appointmentId) => {
  const rows = await query(
    `
    SELECT
      a.appointment_id,
      a.schedule_id,
      a.doctor_id,
      a.patient_user_id,
      a.patient_name,
      a.patient_email,
      a.patient_phone,
      a.symptoms,
      a.appointment_date,
      a.appointment_time,
      a.status,
      a.created_at,
      a.updated_at,
      d.name AS doctor_name,
      d.department,
      d.specialization,
      d.medical_name,
      d.email AS doctor_profile_email,
      patient_user.email AS patient_user_email,
      patient_user.full_name AS patient_user_name,
      doctor_user.user_id AS doctor_user_id,
      doctor_user.email AS doctor_user_email,
      doctor_user.full_name AS doctor_user_name
    FROM appointments a
    INNER JOIN doctors d ON d.doctor_id = a.doctor_id
    LEFT JOIN users patient_user ON patient_user.user_id = a.patient_user_id
    LEFT JOIN users doctor_user
      ON doctor_user.doctor_id = a.doctor_id
      AND doctor_user.role = 'doctor'
    WHERE a.appointment_id = ?
    LIMIT 1
    `,
    [appointmentId],
  );

  return rows[0] || null;
};

const resolveRecipients = (context) => {
  const recipients = [];

  if (
    context.patient_user_id ||
    context.patient_user_email ||
    context.patient_email
  ) {
    recipients.push({
      role: "patient",
      userId: context.patient_user_id || null,
      email: context.patient_user_email || context.patient_email || null,
      displayName:
        context.patient_user_name || context.patient_name || "Patient",
    });
  }

  if (
    context.doctor_user_id ||
    context.doctor_user_email ||
    context.doctor_profile_email
  ) {
    recipients.push({
      role: "doctor",
      userId: context.doctor_user_id || null,
      email: context.doctor_user_email || context.doctor_profile_email || null,
      displayName: context.doctor_user_name || context.doctor_name || "Doctor",
    });
  }

  return recipients;
};

const getPreferenceRow = async (userId) => {
  if (!userId) {
    return null;
  }

  const rows = await query(
    `
    SELECT email_enabled, portal_enabled, reminder_enabled, reminder_hours_before
    FROM notification_preferences
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId],
  );

  return rows[0] || null;
};

const ensureNotificationPreference = async (userId) => {
  if (!userId) {
    return DEFAULT_PREFERENCES;
  }

  let row = await getPreferenceRow(userId);
  if (row) {
    return {
      emailEnabled: normalizeBoolean(row.email_enabled),
      portalEnabled: normalizeBoolean(row.portal_enabled),
      reminderEnabled: normalizeBoolean(row.reminder_enabled),
      reminderHoursBefore: sanitizeHours(row.reminder_hours_before),
    };
  }

  try {
    await query("INSERT INTO notification_preferences (user_id) VALUES (?)", [
      userId,
    ]);
  } catch (error) {
    if (!isDuplicateError(error)) {
      throw error;
    }
  }

  row = await getPreferenceRow(userId);
  if (!row) {
    return DEFAULT_PREFERENCES;
  }

  return {
    emailEnabled: normalizeBoolean(row.email_enabled),
    portalEnabled: normalizeBoolean(row.portal_enabled),
    reminderEnabled: normalizeBoolean(row.reminder_enabled),
    reminderHoursBefore: sanitizeHours(row.reminder_hours_before),
  };
};

const createNotificationRecord = async ({
  userId = null,
  appointmentId = null,
  relatedEntityType = null,
  relatedEntityId = null,
  recipientRole,
  channel,
  eventType,
  title,
  message,
  emailAddress = null,
  status = "pending",
  scheduledFor = null,
  sentAt = null,
  readAt = null,
  metadata = null,
  dedupeKey,
}) => {
  await ensureNotificationSchema();

  try {
    const result = await query(
      `
      INSERT INTO notifications (
        user_id,
        appointment_id,
        related_entity_type,
        related_entity_id,
        recipient_role,
        channel,
        event_type,
        title,
        message,
        email_address,
        status,
        scheduled_for,
        sent_at,
        read_at,
        metadata,
        dedupe_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        appointmentId,
        relatedEntityType,
        relatedEntityId,
        recipientRole,
        channel,
        eventType,
        title,
        message,
        emailAddress,
        status,
        scheduledFor,
        sentAt,
        readAt,
        metadata ? JSON.stringify(metadata) : null,
        dedupeKey,
      ],
    );

    return result.insertId || null;
  } catch (error) {
    if (isDuplicateError(error)) {
      return null;
    }
    throw error;
  }
};

const createPortalNotification = async ({
  userId,
  appointmentId = null,
  relatedEntityType = null,
  relatedEntityId = null,
  recipientRole = "patient",
  eventType,
  title,
  message,
  metadata = null,
  dedupeKey,
}) => {
  if (!userId) {
    return null;
  }

  return createNotificationRecord({
    userId,
    appointmentId,
    relatedEntityType,
    relatedEntityId,
    recipientRole,
    channel: "portal",
    eventType,
    title,
    message,
    status: "sent",
    sentAt: formatDateTimeForDb(new Date()),
    metadata,
    dedupeKey,
  });
};

const updateNotificationRecord = async (
  notificationId,
  { status, sentAt = undefined, readAt = undefined, metadata = undefined },
) => {
  const assignments = ["status = ?"];
  const params = [status];

  if (sentAt !== undefined) {
    assignments.push("sent_at = ?");
    params.push(sentAt);
  }

  if (readAt !== undefined) {
    assignments.push("read_at = ?");
    params.push(readAt);
  }

  if (metadata !== undefined) {
    assignments.push("metadata = ?");
    params.push(metadata ? JSON.stringify(metadata) : null);
  }

  assignments.push("updated_at = CURRENT_TIMESTAMP");
  params.push(notificationId);

  await query(
    `
    UPDATE notifications
    SET ${assignments.join(", ")}
    WHERE notification_id = ?
    `,
    params,
  );
};

const attemptEmailDelivery = async (notification) => {
  const metadata = safeJsonParse(notification.metadata, {}) || {};
  const result = await sendEmail({
    to: notification.email_address,
    subject: notification.title,
    title: notification.title,
    message: notification.message,
    details: metadata.details || [],
  });

  const nextMetadata = {
    ...metadata,
    emailDelivery: {
      status: result.status,
      provider: result.provider || null,
      externalId: result.externalId || null,
      reason: result.reason || null,
      processedAt: new Date().toISOString(),
    },
  };

  await updateNotificationRecord(notification.notification_id, {
    status: result.status,
    sentAt:
      result.status === "sent" || result.status === "skipped"
        ? formatDateTimeForDb(new Date())
        : null,
    metadata: nextMetadata,
  });

  return result;
};

const skipPendingReminderNotifications = async (appointmentId) => {
  await query(
    `
    UPDATE notifications
    SET status = 'skipped',
        sent_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE appointment_id = ?
      AND event_type = 'reminder'
      AND status = 'pending'
    `,
    [appointmentId],
  );
};

const enqueueImmediateNotification = async ({
  appointmentId,
  recipient,
  preferences,
  eventType,
  context,
  title,
  message,
  details,
  metadata,
  dedupeBase,
}) => {
  if (recipient.userId && preferences.portalEnabled) {
    await createNotificationRecord({
      userId: recipient.userId,
      appointmentId,
      recipientRole: recipient.role,
      channel: "portal",
      eventType,
      title,
      message,
      status: "sent",
      sentAt: formatDateTimeForDb(new Date()),
      metadata,
      dedupeKey: `${dedupeBase}:portal`,
    });
  }

  if (
    recipient.email &&
    preferences.emailEnabled &&
    shouldSendEmailToRecipient(recipient) &&
    shouldSendImmediateEmail({ eventType, context, recipient })
  ) {
    const notificationId = await createNotificationRecord({
      userId: recipient.userId,
      appointmentId,
      recipientRole: recipient.role,
      channel: "email",
      eventType,
      title,
      message,
      emailAddress: recipient.email,
      status: "pending",
      metadata,
      dedupeKey: `${dedupeBase}:email`,
    });

    if (notificationId) {
      await attemptEmailDelivery({
        notification_id: notificationId,
        email_address: recipient.email,
        title,
        message,
        metadata: JSON.stringify({
          ...metadata,
          details,
        }),
      });
    }
  }
};

const queueReminderNotifications = async (context, recipient, preferences) => {
  if (!preferences.reminderEnabled) {
    return;
  }

  const { appointmentAt, sendReminder } = getReminderValidity(context);
  if (!appointmentAt || !sendReminder) {
    return;
  }

  const reminderHours = sanitizeHours(preferences.reminderHoursBefore);
  const scheduledForDate = new Date(
    appointmentAt.getTime() - reminderHours * 60 * 60 * 1000,
  );
  const isDueNow = scheduledForDate.getTime() <= Date.now();

  const { title, message } = buildNotificationContent(
    "reminder",
    context,
    recipient.role,
  );
  const details = buildNotificationDetails(context, recipient.role);
  const metadata = {
    appointmentId: context.appointment_id,
    doctorId: context.doctor_id,
    patientName: context.patient_name,
    doctorName: context.doctor_name,
    specialization: context.specialization,
    location: getLocationLabel(context),
    appointmentDate: context.appointment_date,
    appointmentTime: context.appointment_time,
    status: context.status,
    details,
    reminderHoursBefore: reminderHours,
  };

  const dedupeBase = [
    context.appointment_id,
    "reminder",
    recipient.role,
    reminderHours,
    context.appointment_date,
    context.appointment_time,
  ].join(":");

  if (recipient.userId && preferences.portalEnabled) {
    await createNotificationRecord({
      userId: recipient.userId,
      appointmentId: context.appointment_id,
      recipientRole: recipient.role,
      channel: "portal",
      eventType: "reminder",
      title,
      message,
      status: isDueNow ? "sent" : "pending",
      scheduledFor: formatDateTimeForDb(scheduledForDate),
      sentAt: isDueNow ? formatDateTimeForDb(new Date()) : null,
      metadata,
      dedupeKey: `${dedupeBase}:portal`,
    });
  }

  if (
    recipient.email &&
    preferences.emailEnabled &&
    shouldSendEmailToRecipient(recipient)
  ) {
    const notificationId = await createNotificationRecord({
      userId: recipient.userId,
      appointmentId: context.appointment_id,
      recipientRole: recipient.role,
      channel: "email",
      eventType: "reminder",
      title,
      message,
      emailAddress: recipient.email,
      status: isDueNow ? "pending" : "pending",
      scheduledFor: formatDateTimeForDb(scheduledForDate),
      metadata,
      dedupeKey: `${dedupeBase}:email`,
    });

    if (notificationId && isDueNow) {
      await attemptEmailDelivery({
        notification_id: notificationId,
        email_address: recipient.email,
        title,
        message,
        metadata: JSON.stringify(metadata),
      });
    }
  }
};

const normalizeDateForMessage = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateTimeForDb(value).slice(0, 10);
  }

  return String(value || "").slice(0, 10);
};

const normalizeTimeForMessage = (value) => String(value || "").slice(0, 8);

const dispatchAppointmentRescheduledNotification = async (
  appointmentId,
  { oldDate, oldTime },
) => {
  const context = await getAppointmentNotificationContext(appointmentId);
  if (!context) {
    return {
      portalStatus: "skipped",
      emailStatus: "skipped",
      reason: "Appointment not found",
    };
  }

  const patientUserId = context.patient_user_id || null;
  const patientEmail = context.patient_user_email || context.patient_email || null;
  const normalizedOldDate = normalizeDateForMessage(oldDate);
  const normalizedOldTime = normalizeTimeForMessage(oldTime);
  const normalizedNewDate = normalizeDateForMessage(context.appointment_date);
  const normalizedNewTime = normalizeTimeForMessage(context.appointment_time);
  const oldDisplay = `${formatDisplayDate(normalizedOldDate)} at ${formatDisplayTime(normalizedOldTime)}`;
  const newDisplay = `${formatDisplayDate(normalizedNewDate)} at ${formatDisplayTime(normalizedNewTime)}`;
  const doctorName = formatDoctorName(context.doctor_name);
  const title = "Appointment Rescheduled";
  const message = `Your appointment with ${doctorName} was rescheduled from ${oldDisplay} to ${newDisplay}.`;
  const details = [
    { label: "Doctor", value: doctorName },
    { label: "Previous Time", value: oldDisplay },
    { label: "New Time", value: newDisplay },
    { label: "Location", value: getLocationLabel(context) },
  ];
  const metadata = {
    type: "appointment_rescheduled",
    appointmentId: context.appointment_id,
    relatedEntityType: "appointment",
    relatedEntityId: context.appointment_id,
    doctorId: context.doctor_id,
    doctorName: context.doctor_name,
    patientName: context.patient_name,
    oldAppointmentDate: normalizedOldDate,
    oldAppointmentTime: normalizedOldTime,
    appointmentDate: normalizedNewDate,
    appointmentTime: normalizedNewTime,
    status: context.status,
    details,
  };

  let portalStatus = "skipped";
  let emailStatus = "skipped";
  let emailResult = null;
  let portalWarning = null;

  try {
    const notificationId = await createPortalNotification({
      userId: patientUserId,
      appointmentId: context.appointment_id,
      relatedEntityType: "appointment",
      relatedEntityId: context.appointment_id,
      recipientRole: "patient",
      eventType: "appointment_rescheduled",
      title,
      message,
      metadata,
      dedupeKey: [
        context.appointment_id,
        "appointment_rescheduled",
        "patient",
        normalizedOldDate,
        normalizedOldTime,
        normalizedNewDate,
        normalizedNewTime,
        "portal",
      ].join(":"),
    });
    portalStatus = notificationId ? "sent" : "duplicate";
  } catch (error) {
    portalStatus = "failed";
    portalWarning = "Portal notification could not be created.";
    console.error(
      `Portal notification failed for rescheduled appointment ${appointmentId}:`,
      error.message,
    );
  }

  if (patientEmail) {
    emailResult = await sendEmail({
      to: patientEmail,
      subject: title,
      title,
      message,
      details,
    });
    emailStatus = emailResult.status;
  } else {
    emailResult = {
      status: "skipped",
      reason: "Patient email is not available",
    };
  }

  return {
    portalStatus,
    emailStatus,
    emailResult,
    portalWarning,
  };
};

const dispatchAppointmentNotifications = async (appointmentId, eventType) => {
  const context = await getAppointmentNotificationContext(appointmentId);
  if (!context) {
    return { delivered: 0, skipped: 1 };
  }

  if (
    eventType === "cancellation" ||
    ["cancelled", "declined", "completed"].includes(
      String(context.status || "").toLowerCase(),
    )
  ) {
    await skipPendingReminderNotifications(appointmentId);
  }

  const recipients = resolveRecipients(context);
  let delivered = 0;

  for (const recipient of recipients) {
    const preferences = await ensureNotificationPreference(recipient.userId);
    const { title, message } = buildNotificationContent(
      eventType,
      context,
      recipient.role,
    );
    const details = buildNotificationDetails(context, recipient.role);
    const metadata = {
      appointmentId: context.appointment_id,
      doctorId: context.doctor_id,
      patientName: context.patient_name,
      doctorName: context.doctor_name,
      specialization: context.specialization,
      location: getLocationLabel(context),
      appointmentDate: context.appointment_date,
      appointmentTime: context.appointment_time,
      status: context.status,
      details,
    };

    const dedupeBase = [
      context.appointment_id,
      eventType,
      recipient.role,
      String(context.status || "na").toLowerCase(),
    ].join(":");

    if (preferences.portalEnabled || preferences.emailEnabled) {
      await enqueueImmediateNotification({
        appointmentId: context.appointment_id,
        recipient,
        preferences,
        eventType,
        context,
        title,
        message,
        details,
        metadata,
        dedupeBase,
      });
      delivered += 1;
    }

    if (String(context.status || "").toLowerCase() === "confirmed") {
      await queueReminderNotifications(context, recipient, preferences);
    }
  }

  return { delivered, skipped: Math.max(0, recipients.length - delivered) };
};

const processDueNotifications = async () => {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;

  try {
    await ensureNotificationSchema();

    const rows = await query(
      `
      SELECT *
      FROM notifications
      WHERE status = 'pending'
        AND scheduled_for IS NOT NULL
      ORDER BY scheduled_for ASC
      LIMIT ${BATCH_SIZE}
      `,
      [],
    );

    for (const notification of rows) {
      const scheduledFor = parseDbDateTime(notification.scheduled_for);
      if (!scheduledFor || scheduledFor.getTime() > Date.now()) {
        continue;
      }

      if (notification.event_type === "reminder") {
        const context = await getAppointmentNotificationContext(
          notification.appointment_id,
        );

        if (!context || !getReminderValidity(context).sendReminder) {
          await updateNotificationRecord(notification.notification_id, {
            status: "skipped",
            sentAt: formatDateTimeForDb(new Date()),
          });
          continue;
        }
      }

      if (notification.channel === "portal") {
        await updateNotificationRecord(notification.notification_id, {
          status: "sent",
          sentAt: formatDateTimeForDb(new Date()),
        });
        continue;
      }

      if (notification.channel === "email") {
        await attemptEmailDelivery(notification);
      }
    }
  } catch (error) {
    console.error("Notification processor failed:", error.message);
  } finally {
    schedulerRunning = false;
  }
};

const startNotificationScheduler = () => {
  if (schedulerHandle) {
    return schedulerHandle;
  }

  processDueNotifications();
  schedulerHandle = setInterval(processDueNotifications, SCHEDULER_INTERVAL_MS);
  return schedulerHandle;
};

module.exports = {
  DEFAULT_PREFERENCES,
  createPortalNotification,
  dispatchAppointmentRescheduledNotification,
  dispatchAppointmentNotifications,
  ensureNotificationSchema,
  ensureNotificationPreference,
  processDueNotifications,
  startNotificationScheduler,
};
