# 📝 Assignment Submission Guide

## Student Information

- **Name:** MD Shafiur Rahman Alvi
- **Student ID:** 23201355
- **Group:** 08
- **Section:** 08
- **Assignment:** Lab Assignment 3
- **Course:** CSE471 - System Analysis and Design
- **Semester:** Spring 2026

---

## ✅ Submission Checklist

### Part 1: Documentation (Assignment Template)

- [ ] Student information filled
- [ ] API descriptions for both features
- [ ] Code snippets for each API
- [ ] Postman screenshots (minimum 10)
- [ ] Database connection proof
- [ ] Server port mentioned (1355)

### Part 2: Code Files (If Required)

- [ ] Backend code folder
- [ ] Frontend code folder
- [ ] README.md
- [ ] .env.example (NOT the actual .env with credentials!)

### Part 3: Postman Testing

- [ ] Import collection: `MediAI_SmartCare_Postman_Collection.json`
- [ ] Test all endpoints
- [ ] Take screenshots
- [ ] Save screenshots with clear naming

---

## 📋 Assignment Template Content

### Feature 1: Doctor Scheduling & Availability Management

#### Description

This feature allows doctors to manage their consultation schedules and available appointment slots. The system automatically prevents booking conflicts and ensures efficient time allocation. Patients can view doctor availability and schedules organized by day of the week.

#### API Endpoints

**1. GET All Doctors**

- **Endpoint URL:** `http://localhost:1355/api/schedule/doctors`
- **HTTP Method:** GET
- **Headers:** None required
- **Parameters:** None
- **Response:** List of all available doctors with details

**Code Snippet:**

```javascript
// Controller: backend/controllers/scheduleController.js
const getAllDoctors = async (req, res) => {
  try {
    const [doctors] = await pool.query(`
      SELECT doctor_id, name, email, phone, specialization,
             department, qualification, experience_years,
             consultation_fee, is_available, created_at
      FROM doctors
      WHERE is_available = TRUE
      ORDER BY name ASC
    `);

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Get Doctors Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctors",
      error: error.message,
    });
  }
};
```

**2. GET Doctor Schedule by ID**

- **Endpoint URL:** `http://localhost:1355/api/schedule/doctors/:doctorId`
- **HTTP Method:** GET
- **Headers:** None required
- **Parameters:** doctorId (URL parameter)
- **Response:** Doctor details with weekly schedule
- **Database Query:** YES ✓ (Performs SELECT query on doctors and doctor_schedules tables)

**Code Snippet:**

```javascript
// Controller: backend/controllers/scheduleController.js
const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Get doctor details from database
    const [doctor] = await pool.query(
      "SELECT * FROM doctors WHERE doctor_id = ?",
      [doctorId],
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get doctor's schedule from database
    const [schedules] = await pool.query(
      `SELECT schedule_id, day_of_week, start_time, end_time,
              slot_duration, is_active
       FROM doctor_schedules
       WHERE doctor_id = ? AND is_active = TRUE
       ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday',
                     'Wednesday', 'Thursday', 'Friday',
                     'Saturday', 'Sunday')`,
      [doctorId],
    );

    res.status(200).json({
      success: true,
      data: {
        doctor: doctor[0],
        schedules: schedules,
      },
    });
  } catch (error) {
    console.error("Get Doctor Schedule Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor schedule",
      error: error.message,
    });
  }
};
```

**3. POST Create Doctor Schedule**

- **Endpoint URL:** `http://localhost:1355/api/schedule/create`
- **HTTP Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body Parameters:**
  ```json
  {
    "doctorId": 1,
    "dayOfWeek": "Monday",
    "startTime": "09:00:00",
    "endTime": "13:00:00",
    "slotDuration": 30
  }
  ```
- **Database Query:** YES ✓ (Performs INSERT into doctor_schedules table)

**Code Snippet:**

```javascript
// Controller: backend/controllers/scheduleController.js
const createDoctorSchedule = async (req, res) => {
  try {
    const { doctorId, dayOfWeek, startTime, endTime, slotDuration } = req.body;

    // Validate required fields
    if (!doctorId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Check for schedule conflicts
    const [conflicts] = await pool.query(
      `SELECT schedule_id FROM doctor_schedules
       WHERE doctor_id = ? AND day_of_week = ?
       AND is_active = TRUE
       AND ((start_time <= ? AND end_time > ?) OR
            (start_time < ? AND end_time >= ?) OR
            (start_time >= ? AND end_time <= ?))`,
      [
        doctorId,
        dayOfWeek,
        startTime,
        startTime,
        endTime,
        endTime,
        startTime,
        endTime,
      ],
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Schedule conflict detected",
      });
    }

    // Insert new schedule into database
    const [result] = await pool.query(
      `INSERT INTO doctor_schedules
       (doctor_id, day_of_week, start_time, end_time, slot_duration)
       VALUES (?, ?, ?, ?, ?)`,
      [doctorId, dayOfWeek, startTime, endTime, slotDuration || 30],
    );

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      scheduleId: result.insertId,
    });
  } catch (error) {
    console.error("Create Schedule Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create schedule",
      error: error.message,
    });
  }
};
```

---

### Feature 2: AI Symptom Checker & Triage System

#### Description

This feature allows patients to enter symptoms into the system, and AI analyzes them to predict possible diseases, urgency levels (Low, Medium, High, Emergency), and recommend appropriate medical specialists. The system uses the Groq API with Llama 3.1 70B model for intelligent medical triage.

#### API Endpoints

**1. POST Check Symptoms (AI Analysis)**

- **Endpoint URL:** `http://localhost:1355/api/symptoms/check`
- **HTTP Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body Parameters:**
  ```json
  {
    "patientName": "John Doe",
    "age": 35,
    "gender": "Male",
    "symptoms": "fever, headache, cough for 3 days"
  }
  ```
- **Database Query:** YES ✓ (Performs INSERT into symptom_checks table)
- **External API:** YES ✓ (Calls Groq AI API for symptom analysis)

**Code Snippet:**

```javascript
// Controller: backend/controllers/symptomController.js
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
    const analysis = aiResult.analysis;

    // Save symptom check to database
    const [result] = await pool.query(
      `INSERT INTO symptom_checks
       (patient_name, patient_age, patient_gender, symptoms,
        predicted_diseases, urgency_level, recommended_specialist,
        ai_advice)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // Prepare response
    res.status(200).json({
      success: true,
      checkId: result.insertId,
      analysis: {
        symptoms: symptoms,
        possibleDiseases: analysis.possibleDiseases || [],
        urgencyLevel: analysis.urgencyLevel || "Medium",
        recommendedSpecialist: analysis.recommendedSpecialist,
        advice: analysis.advice,
        warning: analysis.warning,
      },
      disclaimer:
        "This is an AI-powered assessment and should not replace professional medical advice.",
    });
  } catch (error) {
    console.error("Symptom Check Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze symptoms",
      error: error.message,
    });
  }
};
```

**AI Service Code:**

```javascript
// AI Service: backend/utils/aiService.js
const analyzeSymptoms = async (symptoms, age, gender) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    const prompt = `You are a medical triage AI assistant.
    Analyze the following patient information and symptoms:

    Patient Information:
    - Age: ${age || "Not provided"}
    - Gender: ${gender || "Not provided"}
    - Symptoms: ${symptoms}

    Provide analysis in JSON format with:
    possibleDiseases, urgencyLevel (Low/Medium/High/Emergency),
    recommendedSpecialist, advice, and warning.`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert medical triage assistant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const aiResponse = response.data.choices[0].message.content;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      analysis: analysis,
    };
  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      success: false,
      error: error.message,
      analysis: {
        possibleDiseases: ["Unable to analyze"],
        urgencyLevel: "Medium",
        recommendedSpecialist: "General Physician",
        advice: "Please consult a healthcare professional",
      },
    };
  }
};
```

**2. GET Symptom History**

- **Endpoint URL:** `http://localhost:1355/api/symptoms/history`
- **HTTP Method:** GET
- **Headers:** None required
- **Query Parameters:**
  - `patientName` (optional)
  - `limit` (optional, default: 50)
- **Response:** List of past symptom checks
- **Database Query:** YES ✓ (Performs SELECT query on symptom_checks table)

**Code Snippet:**

```javascript
const getSymptomHistory = async (req, res) => {
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

    const [history] = await pool.query(query, params);

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
```

---

## 🗄️ Database Information

**Database:** MySQL (TiDB Cloud Free Tier)
**Server Port:** 1355 (last 4 digits of Student ID: 23201355)

**Tables Created:**

1. `doctors` - Stores doctor information
2. `doctor_schedules` - Stores doctor availability schedules
3. `symptom_checks` - Stores symptom check history
4. `time_slots` - Stores available time slots

**Sample Database Queries Used:**

```sql
-- Get all doctors
SELECT * FROM doctors WHERE is_available = TRUE;

-- Get doctor schedule
SELECT * FROM doctor_schedules WHERE doctor_id = 1 AND is_active = TRUE;

-- Insert symptom check
INSERT INTO symptom_checks (patient_name, symptoms, urgency_level)
VALUES ('John Doe', 'fever and cough', 'Medium');

-- Get symptom history
SELECT * FROM symptom_checks ORDER BY check_date DESC LIMIT 10;
```

---

## 📸 Postman Screenshots Guide

For each API, include screenshots showing:

1. **Request Section:**
   - Complete URL
   - HTTP Method (GET/POST/PUT/DELETE)
   - Headers tab (show Content-Type if applicable)
   - Body tab (for POST/PUT requests)

2. **Response Section:**
   - Status code (200, 201, 404, etc.)
   - Response time
   - Response body (JSON formatted)

**Naming Convention for Screenshots:**

- `1_GET_AllDoctors.png`
- `2_GET_DoctorSchedule_DB.png`
- `3_POST_CreateSchedule_DB.png`
- `4_POST_CheckSymptoms_AI_DB.png`
- `5_GET_SymptomHistory_DB.png`

---

## 🎯 Key Points to Highlight

1. **Database Integration:** Multiple endpoints perform actual database queries (marked with ✓)
2. **External API:** AI integration using Groq API (Llama 3.1 70B model)
3. **Server Port:** 1355 (matches student ID requirement)
4. **Code Organization:** Separate folders for routes, controllers, models, utils
5. **Error Handling:** Comprehensive error handling in all endpoints
6. **Security:** Environment variables for sensitive data
7. **Validation:** Input validation on all POST/PUT endpoints

---

## 📦 Files to Submit

1. **Assignment Document** (from template) - PDF
2. **Postman Screenshots** - 10+ images
3. **Source Code** (if required) - ZIP file containing:
   - backend/ folder
   - frontend/ folder
   - README.md
   - .env.example (NOT actual .env!)
   - package.json files

---

## ⚠️ Important Notes

- Never share actual `.env` file with database credentials
- Always include `.env.example` as template
- Mention that actual credentials will be provided separately if needed
- Highlight which endpoints perform database queries
- Mention external API integration (Groq AI)
- Emphasize the port number matching student ID

---

**Ready for Submission! 🎉**
