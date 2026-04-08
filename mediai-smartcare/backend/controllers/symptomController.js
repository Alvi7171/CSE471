const { db } = require("../config/database");
const { analyzeSymptoms } = require("../utils/aiService");

/**
 * Symptom Checker Controller
 * Handles AI-powered symptom analysis and triage
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 */

// ============================================
// POST: Analyze symptoms using AI
// ============================================
const checkSymptoms = async (req, res) => {
  try {
    const { patientName, age, gender, symptoms } = req.body;

    // Validate required fields
    if (!symptoms || symptoms.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Symptoms are required",
      });
    }

    // Call AI service to analyze symptoms
    const aiResult = await analyzeSymptoms(symptoms, age, gender);

    if (!aiResult.success) {
      // AI service failed, but we still save the record
      console.warn("AI analysis failed, using fallback response");
    }

    const analysis = aiResult.analysis;

    // Save symptom check to database
    const result = db.prepare(`
      INSERT INTO symptom_checks
      (patient_name, patient_age, patient_gender, symptoms, predicted_diseases, urgency_level, recommended_specialist, ai_advice)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      patientName || "Anonymous",
      age || null,
      gender || null,
      symptoms,
      JSON.stringify(analysis.possibleDiseases || []),
      analysis.urgencyLevel || "Medium",
      analysis.recommendedSpecialist || "General Physician",
      JSON.stringify({
        advice: analysis.advice,
        warning: analysis.warning,
      })
    );

    // Prepare response
    const response = {
      success: true,
      checkId: result.lastInsertRowid,
      analysis: {
        symptoms: symptoms,
        possibleDiseases: analysis.possibleDiseases || [],
        urgencyLevel: analysis.urgencyLevel || "Medium",
        recommendedSpecialist:
          analysis.recommendedSpecialist || "General Physician",
        advice:
          analysis.advice || "Please consult with a healthcare professional.",
        warning: analysis.warning || null,
      },
      disclaimer:
        "⚠️ This is an AI-powered assessment and should not replace professional medical advice. Please consult a qualified healthcare provider for accurate diagnosis and treatment.",
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Symptom Check Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze symptoms",
      error: error.message,
    });
  }
};

// ============================================
// GET: Retrieve symptom check history
// ============================================
const getSymptomHistory = (req, res) => {
  try {
    const { patientName, limit = 50 } = req.query;

    let query = "SELECT * FROM symptom_checks";
    const params = [];

    if (patientName) {
      query += " WHERE patient_name = ?";
      params.push(patientName);
    }

    query += " ORDER BY check_date DESC LIMIT ?";
    params.push(parseInt(limit));

    const history = db.prepare(query).all(...params);

    // Parse JSON fields
    const formattedHistory = history.map((record) => ({
      ...record,
      predicted_diseases: JSON.parse(record.predicted_diseases || "[]"),
      ai_advice: JSON.parse(record.ai_advice || "{}"),
    }));

    res.status(200).json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory,
    });
  } catch (error) {
    console.error("Get History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve symptom history",
      error: error.message,
    });
  }
};

// ============================================
// GET: Retrieve specific symptom check by ID
// ============================================
const getSymptomCheckById = (req, res) => {
  try {
    const { checkId } = req.params;

    const check = db.prepare("SELECT * FROM symptom_checks WHERE check_id = ?").get(checkId);

    if (!check) {
      return res.status(404).json({
        success: false,
        message: "Symptom check not found",
      });
    }

    // Parse JSON fields
    check.predicted_diseases = JSON.parse(check.predicted_diseases || "[]");
    check.ai_advice = JSON.parse(check.ai_advice || "{}");

    res.status(200).json({
      success: true,
      data: check,
    });
  } catch (error) {
    console.error("Get Symptom Check Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve symptom check",
      error: error.message,
    });
  }
};

// ============================================
// GET: Get statistics on symptom checks
// ============================================
const getSymptomStatistics = (req, res) => {
  try {
    // Total checks
    const totalChecks = db.prepare("SELECT COUNT(*) as total FROM symptom_checks").get();

    // Urgency level breakdown
    const urgencyStats = db.prepare(`
      SELECT
        urgency_level,
        COUNT(*) as count
      FROM symptom_checks
      GROUP BY urgency_level
      ORDER BY
        CASE urgency_level
          WHEN 'Emergency' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
        END
    `).all();

    // Most common specialists recommended
    const specialistStats = db.prepare(`
      SELECT
        recommended_specialist,
        COUNT(*) as count
      FROM symptom_checks
      GROUP BY recommended_specialist
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Recent checks (last 7 days)
    const recentChecks = db.prepare(`
      SELECT COUNT(*) as count
      FROM symptom_checks
      WHERE check_date >= datetime('now', '-7 days')
    `).get();

    res.status(200).json({
      success: true,
      statistics: {
        totalChecks: totalChecks.total,
        urgencyBreakdown: urgencyStats,
        topSpecialists: specialistStats,
        recentChecks: recentChecks.count,
      },
    });
  } catch (error) {
    console.error("Get Statistics Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
    });
  }
};

// ============================================
// POST: Quick triage assessment (simplified)
// ============================================
const quickTriage = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({
        success: false,
        message: "Symptoms are required",
      });
    }

    // Quick AI analysis without saving to database
    const aiResult = await analyzeSymptoms(symptoms);

    res.status(200).json({
      success: true,
      triage: {
        urgencyLevel: aiResult.analysis.urgencyLevel,
        recommendedSpecialist: aiResult.analysis.recommendedSpecialist,
        quickAdvice: aiResult.analysis.advice,
      },
      disclaimer:
        "This is a quick assessment. For detailed analysis, please use the full symptom checker.",
    });
  } catch (error) {
    console.error("Quick Triage Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform triage",
      error: error.message,
    });
  }
};

module.exports = {
  checkSymptoms,
  getSymptomHistory,
  getSymptomCheckById,
  getSymptomStatistics,
  quickTriage,
};
