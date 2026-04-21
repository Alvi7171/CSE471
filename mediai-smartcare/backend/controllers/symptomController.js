const { query } = require("../config/database");
const { analyzeSymptoms } = require("../utils/aiService");

const checkSymptoms = async (req, res) => {
  try {
    const { patientName, age, gender, symptoms } = req.body;

    if (!symptoms || !String(symptoms).trim()) {
      return res.status(400).json({
        success: false,
        message: "Symptoms are required",
      });
    }

    const aiResult = await analyzeSymptoms(symptoms, age, gender);
    const analysis = aiResult.analysis || {};

    const result = await query(
      `
      INSERT INTO symptom_checks
      (patient_name, patient_age, patient_gender, symptoms, predicted_diseases, urgency_level, recommended_specialist, ai_advice)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
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
        }),
      ],
    );

    return res.status(200).json({
      success: true,
      checkId: result.insertId,
      analysis: {
        symptoms,
        possibleDiseases: analysis.possibleDiseases || [],
        urgencyLevel: analysis.urgencyLevel || "Medium",
        recommendedSpecialist:
          analysis.recommendedSpecialist || "General Physician",
        advice:
          analysis.advice || "Please consult with a healthcare professional.",
        warning: analysis.warning || null,
      },
      disclaimer:
        "This is an AI-powered assessment and should not replace professional medical advice.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to analyze symptoms",
      error: error.message,
    });
  }
};

const getSymptomHistory = async (req, res) => {
  try {
    const { patientName, limit = 50 } = req.query;

    let sql = "SELECT * FROM symptom_checks";
    const params = [];

    if (patientName) {
      sql += " WHERE patient_name = ?";
      params.push(patientName);
    }

    sql += " ORDER BY check_date DESC LIMIT ?";
    params.push(Number(limit));

    const rows = await query(sql, params);

    const formatted = rows.map((record) => ({
      ...record,
      predicted_diseases: JSON.parse(record.predicted_diseases || "[]"),
      ai_advice: JSON.parse(record.ai_advice || "{}"),
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve symptom history",
      error: error.message,
    });
  }
};

const getSymptomCheckById = async (req, res) => {
  try {
    const { checkId } = req.params;

    const rows = await query(
      "SELECT * FROM symptom_checks WHERE check_id = ? LIMIT 1",
      [checkId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Symptom check not found",
      });
    }

    const check = rows[0];
    check.predicted_diseases = JSON.parse(check.predicted_diseases || "[]");
    check.ai_advice = JSON.parse(check.ai_advice || "{}");

    return res.status(200).json({
      success: true,
      data: check,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve symptom check",
      error: error.message,
    });
  }
};

const getSymptomStatistics = async (req, res) => {
  try {
    const totalChecksRows = await query(
      "SELECT COUNT(*) AS total FROM symptom_checks",
    );

    const urgencyStats = await query(
      `
      SELECT urgency_level, COUNT(*) AS count
      FROM symptom_checks
      GROUP BY urgency_level
      ORDER BY
        CASE urgency_level
          WHEN 'Emergency' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END
      `,
    );

    const specialistStats = await query(
      `
      SELECT recommended_specialist, COUNT(*) AS count
      FROM symptom_checks
      GROUP BY recommended_specialist
      ORDER BY count DESC
      LIMIT 10
      `,
    );

    const recentChecksRows = await query(
      "SELECT COUNT(*) AS count FROM symptom_checks WHERE check_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
    );

    return res.status(200).json({
      success: true,
      statistics: {
        totalChecks: totalChecksRows[0]?.total || 0,
        urgencyBreakdown: urgencyStats,
        topSpecialists: specialistStats,
        recentChecks: recentChecksRows[0]?.count || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
    });
  }
};

const quickTriage = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({
        success: false,
        message: "Symptoms are required",
      });
    }

    const aiResult = await analyzeSymptoms(symptoms);

    return res.status(200).json({
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
    return res.status(500).json({
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
