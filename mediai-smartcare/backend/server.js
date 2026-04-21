const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testConnection, engine } = require("./config/database");
const scheduleRoutes = require("./routes/doctorSchedule");
const symptomRoutes = require("./routes/symptomChecker");
const appointmentRoutes = require("./routes/appointments");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const patientRoutes = require("./routes/patients");
const analyticsRoutes = require("./routes/analytics");
const notificationRoutes = require("./routes/notifications");
const labEmergencyRoutes = require("./routes/labEmergency");
const {
  startNotificationScheduler,
} = require("./utils/notificationService");

// Initialize Express app
const app = express();

// Port configuration (last 4 digits of student ID: 23201355)
const PORT = process.env.PORT || 1355;

// ============================================
// Middleware Configuration
// ============================================
app.use(
  cors({
    origin: "*", // For development; restrict in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// API Routes
// ============================================

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MediAI SmartCare API Server",
    version: "1.0.0",
    author: "MD Shafiur Rahman Alvi",
    studentId: "23201355",
    features: [
      "AI Symptom Checker & Triage System",
      "Doctor Scheduling & Availability Management",
      "Appointment Notifications & Reminder Delivery",
      "Patient Management & Medical Timeline",
      "Hospital Analytics Reports & Dashboard",
    ],
    endpoints: {
      schedule: "/api/schedule",
      symptoms: "/api/symptoms",
      notifications: "/api/notifications",
      patients: "/api/patients",
      analytics: "/api/analytics",
    },
    status: "Running",
  });
});

// API status endpoint
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    server: "Online",
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Feature routes
app.use("/api/schedule", scheduleRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/lab", labEmergencyRoutes);
app.use("/api/emergency", labEmergencyRoutes);

// ============================================
// Error Handling Middleware
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ============================================
// Server Initialization
// ============================================
const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      if ((process.env.NODE_ENV || "development") === "production") {
        throw new Error("JWT_SECRET is required in environment variables");
      }

      process.env.JWT_SECRET = "dev-only-jwt-secret-change-me";
      console.warn(
        "JWT_SECRET not set. Using temporary development secret. Add JWT_SECRET to .env for production.",
      );
    }

    // Test database connection
    console.log("🔄 Testing database connection...");
    await testConnection();

    // Start server
    app.listen(PORT, () => {
      startNotificationScheduler();
      console.log("\n========================================");
      console.log("🏥 MediAI SmartCare Server Started");
      console.log("========================================");
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`👨‍💻 Student: MD Shafiur Rahman Alvi`);
      console.log(`🆔 ID: 23201355`);
      console.log(
        `💾 Database: ${engine === "sqlite" ? "SQLite (local fallback)" : "MySQL (Railway compatible)"}`,
      );
      console.log("========================================");
      console.log("\n📋 Available Endpoints:");
      console.log(`   - GET  http://localhost:${PORT}/`);
      console.log(`   - GET  http://localhost:${PORT}/api/status`);
      console.log("\n🩺 Doctor Scheduling APIs:");
      console.log(`   - GET  http://localhost:${PORT}/api/schedule/doctors`);
      console.log(
        `   - GET  http://localhost:${PORT}/api/schedule/doctors/search?specialization=Cardiology`,
      );
      console.log(
        `   - GET  http://localhost:${PORT}/api/schedule/doctors/:doctorId`,
      );
      console.log(`   - POST http://localhost:${PORT}/api/schedule/create`);
      console.log(
        `   - PUT  http://localhost:${PORT}/api/schedule/:scheduleId`,
      );
      console.log(
        `   - DEL  http://localhost:${PORT}/api/schedule/:scheduleId`,
      );
      console.log("\n🤖 AI Symptom Checker APIs:");
      console.log(`   - POST http://localhost:${PORT}/api/symptoms/check`);
      console.log(`   - POST http://localhost:${PORT}/api/symptoms/triage`);
      console.log(`   - GET  http://localhost:${PORT}/api/symptoms/history`);
      console.log(`   - GET  http://localhost:${PORT}/api/symptoms/:checkId`);
      console.log(
        `   - GET  http://localhost:${PORT}/api/symptoms/stats/overview`,
      );
      console.log("\n👥 Patient Management APIs:");
      console.log(`   - GET  http://localhost:${PORT}/api/patients`);
      console.log(`   - GET  http://localhost:${PORT}/api/patients/:phone/timeline`);
      console.log("========================================\n");
      console.log("✅ Server is ready to accept requests!\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
