const { db } = require("../config/database");

/**
 * Get all unique patients
 * GET /api/patients
 */
exports.getAllPatients = (req, res) => {
  try {
    const patients = db.prepare(`
      SELECT 
        patient_name as name, 
        patient_age as age, 
        patient_gender as gender, 
        patient_phone as phone, 
        patient_email as email,
        COUNT(appointment_id) as total_appointments,
        MAX(appointment_date) as last_visit
      FROM appointments
      GROUP BY patient_phone
      ORDER BY last_visit DESC
    `).all();

    res.json({ success: true, count: patients.length, patients });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ success: false, message: "Failed to fetch patients", error: error.message });
  }
};

/**
 * Get patient timeline Data
 * GET /api/patients/:phone/timeline
 */
exports.getPatientTimeline = (req, res) => {
  try {
    const { phone } = req.params;
    const decodedPhone = decodeURIComponent(phone);

    // Get basic info
    const patientQuery = db.prepare(`
      SELECT patient_name as name, patient_age as age, patient_gender as gender, patient_phone as phone, patient_email as email
      FROM appointments
      WHERE patient_phone = ?
      LIMIT 1
    `).get(decodedPhone);

    if (!patientQuery) {
       return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Get appointments history
    const appointments = db.prepare(`
      SELECT 
        a.appointment_id, a.appointment_date, a.appointment_time, a.status, a.notes, a.symptoms as appointment_reason,
        d.name as doctor_name, d.specialization as doctor_specialization
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.patient_phone = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `).all(decodedPhone);

    // Get symptom checks
    const symptomChecks = db.prepare(`
      SELECT 
        check_id, symptoms, predicted_diseases, urgency_level, ai_advice, recommended_specialist, check_date
      FROM symptom_checks
      WHERE patient_name = ?
      ORDER BY check_date DESC
    `).all(patientQuery.name);

    const timeline = [];

    appointments.forEach(app => {
      timeline.push({
        type: 'appointment',
        id: app.appointment_id,
        date: app.appointment_date + 'T' + app.appointment_time,
        displayDate: app.appointment_date + ' ' + app.appointment_time,
        status: app.status,
        notes: app.notes,
        reason: app.appointment_reason,
        doctorInfo: app.doctor_name + ' (' + app.doctor_specialization + ')'
      });
    });

    symptomChecks.forEach(sc => {
      timeline.push({
        type: 'symptom_check',
        id: sc.check_id,
        date: sc.check_date.replace(' ', 'T'),
        displayDate: sc.check_date,
        symptoms: sc.symptoms,
        predictedDiseases: sc.predicted_diseases,
        urgency: sc.urgency_level,
        advice: JSON.parse(sc.ai_advice || '{}').advice || sc.ai_advice
      });
    });

    // Sort timeline chronologically (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, patient: patientQuery, timeline });
  } catch (error) {
    console.error("Error fetching patient timeline:", error);
    res.status(500).json({ success: false, message: "Failed to fetch timeline", error: error.message });
  }
};

/**
 * Get AI Patient History Summary
 * GET /api/patients/:phone/summary
 */
exports.getPatientSummary = async (req, res) => {
  try {
    const { phone } = req.params;
    const decodedPhone = decodeURIComponent(phone);

    // Get basic info
    const patientQuery = db.prepare(`
      SELECT patient_name as name, patient_age as age, patient_gender as gender, patient_phone as phone, patient_email as email
      FROM appointments
      WHERE patient_phone = ?
      LIMIT 1
    `).get(decodedPhone);

    if (!patientQuery) {
       return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Get appointments history
    const appointments = db.prepare(`
      SELECT 
        a.appointment_id, a.appointment_date, a.appointment_time, a.status, a.notes, a.symptoms as appointment_reason,
        d.name as doctor_name, d.specialization as doctor_specialization
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.patient_phone = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `).all(decodedPhone);

    // Get symptom checks
    const symptomChecks = db.prepare(`
      SELECT 
        check_id, symptoms, predicted_diseases, urgency_level, ai_advice, recommended_specialist, check_date
      FROM symptom_checks
      WHERE patient_name = ?
      ORDER BY check_date DESC
    `).all(patientQuery.name);

    const timeline = [];

    appointments.forEach(app => {
      timeline.push({
        type: 'appointment',
        id: app.appointment_id,
        date: app.appointment_date + 'T' + app.appointment_time,
        status: app.status,
        notes: app.notes,
        reason: app.appointment_reason
      });
    });

    symptomChecks.forEach(sc => {
      timeline.push({
        type: 'symptom_check',
        id: sc.check_id,
        date: sc.check_date.replace(' ', 'T'),
        symptoms: sc.symptoms,
        predictedDiseases: sc.predicted_diseases,
        urgency: sc.urgency_level
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Call the AI Service
    const { generatePatientSummary } = require("../utils/aiService");
    const aiResult = await generatePatientSummary(patientQuery, timeline);

    // Provide the summary even if it's the fallback error summary
    res.json({ success: true, summary: aiResult.summary });

  } catch (error) {
    console.error("Error generating patient summary:", error);
    res.status(500).json({ success: false, message: "Failed to generate AI summary", error: error.message });
  }
};
