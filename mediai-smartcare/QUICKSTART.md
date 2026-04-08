# 🚀 Quick Start Guide

## For Students Running This Project

### Step 1: Clone/Download the Project

```bash
cd mediai-smartcare
```

### Step 2: Setup Backend (5 minutes)

1. **Get TiDB Cloud Database (FREE)**
   - Go to https://tidbcloud.com/
   - Sign up → Create Free Cluster
   - Click "Connect" → Copy credentials

2. **Get Groq API Key (FREE - No Credit Card!)**
   - Go to https://console.groq.com/
   - Sign up with email/GitHub
   - Go to https://console.groq.com/keys
   - Click "Create API Key"
   - Copy the key (it starts with `gsk_`)

3. **Configure Backend**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your credentials
npm start
```

Server will start on http://localhost:1355

### Step 3: Setup Database Tables

1. Open TiDB Cloud Console
2. Go to "SQL Editor" or "Chat2Query"
3. Copy and paste the entire content from `backend/models/schema.sql`
4. Execute the SQL script
5. Verify tables are created with sample data

### Step 4: Setup Frontend (2 minutes)

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will open at http://localhost:3000

### Step 5: Test Everything

Open http://localhost:3000 and:

1. Try the AI Symptom Checker
2. Browse doctor schedules
3. Create new schedules

---

## Testing with Postman

### Quick Test URLs

**Backend Health Check:**

```
GET http://localhost:1355/
```

**Get All Doctors:**

```
GET http://localhost:1355/api/schedule/doctors
```

**Check Symptoms:**

```
POST http://localhost:1355/api/symptoms/check
Headers: Content-Type: application/json
Body:
{
  "patientName": "Test User",
  "age": 25,
  "gender": "Male",
  "symptoms": "fever and headache for 2 days"
}
```

---

## Common Issues & Solutions

### ❌ "Database connection failed"

**Solution:**

- Check TiDB Cloud cluster is running (green status)
- Verify credentials in `.env` file
- Make sure DB_SSL=true

### ❌ "GROQ_API_KEY not configured"

**Solution:**

- Get API key from https://console.groq.com/keys
- Add to `.env` file: `GROQ_API_KEY=gsk_your_key_here`

### ❌ "Port 1355 already in use"

**Solution:**

```bash
# On Mac/Linux
lsof -ti:1355 | xargs kill -9

# On Windows
netstat -ano | findstr :1355
taskkill /PID [PID_NUMBER] /F
```

### ❌ "Cannot connect to backend from frontend"

**Solution:**

- Make sure backend is running (http://localhost:1355)
- Check CORS is enabled in server.js
- Verify API_BASE_URL in frontend/src/services/api.js

---

## For Assignment Submission

### What to Submit:

1. **Code Files** (if required)
2. **Postman Screenshots** - 10+ screenshots showing:
   - Request URL and method
   - Request body
   - Response with status code
   - Response data
3. **Assignment Document** with:
   - API descriptions
   - Code snippets for each API
   - Screenshots from Postman
   - Student information

### Code Snippets for Assignment

#### Symptom Checker API (Controller Code)

```javascript
// File: backend/controllers/symptomController.js
const checkSymptoms = async (req, res) => {
  const { patientName, age, gender, symptoms } = req.body;
  const aiResult = await analyzeSymptoms(symptoms, age, gender);

  const [result] = await pool.query(
    `INSERT INTO symptom_checks
     (patient_name, patient_age, patient_gender, symptoms,
      predicted_diseases, urgency_level, recommended_specialist, ai_advice)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      patientName,
      age,
      gender,
      symptoms,
      JSON.stringify(aiResult.analysis.possibleDiseases),
      aiResult.analysis.urgencyLevel,
      aiResult.analysis.recommendedSpecialist,
      JSON.stringify({ advice: aiResult.analysis.advice }),
    ],
  );

  res.status(200).json({ success: true, analysis: aiResult.analysis });
};
```

#### Doctor Schedule API (Controller Code)

```javascript
// File: backend/controllers/scheduleController.js
const getDoctorSchedule = async (req, res) => {
  const { doctorId } = req.params;

  const [doctor] = await pool.query(
    "SELECT * FROM doctors WHERE doctor_id = ?",
    [doctorId],
  );

  const [schedules] = await pool.query(
    `SELECT * FROM doctor_schedules
     WHERE doctor_id = ? AND is_active = TRUE
     ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday',
                    'Thursday', 'Friday', 'Saturday', 'Sunday')`,
    [doctorId],
  );

  res.status(200).json({
    success: true,
    data: { doctor: doctor[0], schedules },
  });
};
```

---

## Video Demo (Optional but Impressive)

Record a 2-3 minute demo showing:

1. Starting the servers
2. Opening the web interface
3. Testing the AI Symptom Checker
4. Managing doctor schedules
5. Postman API testing

Tools: OBS Studio, Loom, or built-in screen recorder

---

## Support

If you have issues:

1. Check the README.md file
2. Review error messages carefully
3. Google the specific error
4. Check TiDB Cloud and Groq API status pages

---

**Good luck with your submission! 🎉**
