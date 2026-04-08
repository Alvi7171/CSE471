# 🏥 MediAI SmartCare - Hospital Management System

**CSE471 Lab Assignment 3**
**Student:** MD Shafiur Rahman Alvi
**Student ID:** 23201355
**Group:** 08 | **Section:** 08
**Submission Date:** March 2026

---

## 📋 Project Overview

MediAI SmartCare is a comprehensive hospital management system featuring:

1. **AI Symptom Checker & Triage System** - AI-powered symptom analysis with urgency assessment
2. **Doctor Scheduling & Availability Management** - Complete schedule management for doctors

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS
- **Backend:** Node.js, Express.js
- **Database:** MySQL (TiDB Cloud - Free Tier)
- **AI Model:** Groq API (Llama 3.1 70B - Free)
- **API Architecture:** RESTful APIs

---

## 📂 Project Structure

```
mediai-smartcare/
├── backend/
│   ├── config/
│   │   └── database.js           # Database connection
│   ├── controllers/
│   │   ├── scheduleController.js # Doctor scheduling logic
│   │   └── symptomController.js  # Symptom checker logic
│   ├── routes/
│   │   ├── doctorSchedule.js     # Schedule routes
│   │   └── symptomChecker.js     # Symptom routes
│   ├── models/
│   │   └── schema.sql            # Database schema
│   ├── utils/
│   │   └── aiService.js          # AI integration
│   ├── .env.example              # Environment template
│   ├── package.json
│   └── server.js                 # Main server file
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── SymptomChecker.jsx
    │   │   └── DoctorSchedule.jsx
    │   ├── services/
    │   │   └── api.js            # API service
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- TiDB Cloud account (free)
- Groq API key (free)

### Step 1: Get TiDB Cloud Database (FREE)

1. Go to [TiDB Cloud](https://tidbcloud.com/)
2. Sign up for a free account
3. Create a new cluster (select "Free Tier")
4. Once created, click "Connect" and note down:
   - Host
   - Port (usually 4000)
   - Username
   - Password
   - Database name

### Step 2: Get Groq API Key (FREE)

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up with your email or GitHub
3. Navigate to [API Keys](https://console.groq.com/keys)
4. Click "Create API Key"
5. Copy the key (starts with `gsk_...`)

### Step 3: Setup Database

1. Connect to your TiDB Cloud database using any MySQL client or the web console
2. Run the SQL schema from `backend/models/schema.sql`
3. This will create all tables and insert sample data

### Step 4: Configure Backend

1. Navigate to backend folder:

```bash
cd mediai-smartcare/backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:

```env
PORT=1355
NODE_ENV=development

# TiDB Cloud Credentials
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=your_username_here
DB_PASSWORD=your_password_here
DB_NAME=mediai_smartcare
DB_SSL=true

# Groq API Key
GROQ_API_KEY=gsk_your_api_key_here
```

5. Start the backend server:

```bash
npm start
```

The server will start on **http://localhost:1355**

### Step 5: Configure Frontend

1. Navigate to frontend folder:

```bash
cd ../frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will open at **http://localhost:3000**

---

## 📡 API Documentation

### Base URL

```
http://localhost:1355/api
```

### Server Port

**1355** (Last 4 digits of Student ID: 23201355)

---

## 🩺 Feature 1: Doctor Scheduling & Availability Management

### API Endpoints

#### 1. GET All Doctors

**Endpoint:** `/api/schedule/doctors`
**Method:** GET
**Description:** Retrieve all available doctors

**Response:**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "doctor_id": 1,
      "name": "Dr. Sarah Ahmed",
      "email": "sarah.ahmed@mediai.com",
      "phone": "+8801712345678",
      "specialization": "Cardiologist",
      "department": "Cardiology",
      "qualification": "MBBS, MD (Cardiology)",
      "experience_years": 12,
      "consultation_fee": "1200.00",
      "is_available": true
    }
  ]
}
```

#### 2. GET Doctor Schedule by ID

**Endpoint:** `/api/schedule/doctors/:doctorId`
**Method:** GET
**Description:** Get specific doctor's schedule
**Database Query:** YES ✓

**Example:** `/api/schedule/doctors/1`

**Response:**

```json
{
  "success": true,
  "data": {
    "doctor": {
      "doctor_id": 1,
      "name": "Dr. Sarah Ahmed",
      "specialization": "Cardiologist",
      "department": "Cardiology"
    },
    "schedules": [
      {
        "schedule_id": 1,
        "day_of_week": "Monday",
        "start_time": "09:00:00",
        "end_time": "13:00:00",
        "slot_duration": 30,
        "is_active": true
      }
    ]
  }
}
```

#### 3. POST Create Doctor Schedule

**Endpoint:** `/api/schedule/create`
**Method:** POST
**Headers:** `Content-Type: application/json`
**Description:** Create new schedule for a doctor
**Database Query:** YES ✓

**Request Body:**

```json
{
  "doctorId": 1,
  "dayOfWeek": "Monday",
  "startTime": "09:00:00",
  "endTime": "13:00:00",
  "slotDuration": 30
}
```

**Response:**

```json
{
  "success": true,
  "message": "Schedule created successfully",
  "data": {
    "schedule_id": 1,
    "doctor_id": 1,
    "day_of_week": "Monday",
    "start_time": "09:00:00",
    "end_time": "13:00:00",
    "slot_duration": 30
  }
}
```

#### 4. PUT Update Doctor Schedule

**Endpoint:** `/api/schedule/:scheduleId`
**Method:** PUT
**Headers:** `Content-Type: application/json`
**Description:** Update existing schedule
**Database Query:** YES ✓

**Request Body:**

```json
{
  "startTime": "10:00:00",
  "endTime": "14:00:00",
  "isActive": true
}
```

#### 5. DELETE Doctor Schedule

**Endpoint:** `/api/schedule/:scheduleId`
**Method:** DELETE
**Description:** Delete/deactivate schedule
**Database Query:** YES ✓

**Response:**

```json
{
  "success": true,
  "message": "Schedule deleted successfully"
}
```

#### 6. GET Search Doctors

**Endpoint:** `/api/schedule/doctors/search`
**Method:** GET
**Query Parameters:**

- `specialization` (optional)
- `department` (optional)
  **Database Query:** YES ✓

**Example:** `/api/schedule/doctors/search?specialization=Cardiology`

---

## 🤖 Feature 2: AI Symptom Checker & Triage System

### API Endpoints

#### 1. POST Check Symptoms (AI Analysis)

**Endpoint:** `/api/symptoms/check`
**Method:** POST
**Headers:** `Content-Type: application/json`
**Description:** Analyze symptoms using AI and save to database
**Database Query:** YES ✓
**AI Integration:** YES (Groq API - Llama 3.1 70B)

**Request Body:**

```json
{
  "patientName": "John Doe",
  "age": 35,
  "gender": "Male",
  "symptoms": "fever, headache, cough for 3 days"
}
```

**Response:**

```json
{
  "success": true,
  "checkId": 1,
  "analysis": {
    "symptoms": "fever, headache, cough for 3 days",
    "possibleDiseases": ["Common Cold", "Influenza", "COVID-19"],
    "urgencyLevel": "Medium",
    "recommendedSpecialist": "General Physician",
    "advice": "Rest, stay hydrated, monitor temperature. See a doctor if symptoms worsen.",
    "warning": "If fever exceeds 103°F or breathing difficulties occur, seek immediate medical attention."
  },
  "disclaimer": "⚠️ This is an AI-powered assessment and should not replace professional medical advice."
}
```

#### 2. POST Quick Triage

**Endpoint:** `/api/symptoms/triage`
**Method:** POST
**Headers:** `Content-Type: application/json`
**Description:** Quick assessment without database save
**AI Integration:** YES

**Request Body:**

```json
{
  "symptoms": "chest pain, shortness of breath"
}
```

**Response:**

```json
{
  "success": true,
  "triage": {
    "urgencyLevel": "Emergency",
    "recommendedSpecialist": "Cardiologist",
    "quickAdvice": "Seek immediate emergency care"
  }
}
```

#### 3. GET Symptom History

**Endpoint:** `/api/symptoms/history`
**Method:** GET
**Query Parameters:**

- `patientName` (optional)
- `limit` (optional, default: 50)
  **Database Query:** YES ✓

**Example:** `/api/symptoms/history?limit=10`

**Response:**

```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "check_id": 1,
      "patient_name": "John Doe",
      "patient_age": 35,
      "patient_gender": "Male",
      "symptoms": "fever, headache",
      "predicted_diseases": ["Common Cold", "Influenza"],
      "urgency_level": "Medium",
      "recommended_specialist": "General Physician",
      "check_date": "2026-03-25T10:30:00.000Z"
    }
  ]
}
```

#### 4. GET Symptom Check by ID

**Endpoint:** `/api/symptoms/:checkId`
**Method:** GET
**Description:** Get specific symptom check details
**Database Query:** YES ✓

**Example:** `/api/symptoms/1`

#### 5. GET Statistics

**Endpoint:** `/api/symptoms/stats/overview`
**Method:** GET
**Description:** Get symptom check statistics
**Database Query:** YES ✓

**Response:**

```json
{
  "success": true,
  "statistics": {
    "totalChecks": 150,
    "urgencyBreakdown": [
      { "urgency_level": "Emergency", "count": 10 },
      { "urgency_level": "High", "count": 25 },
      { "urgency_level": "Medium", "count": 80 },
      { "urgency_level": "Low", "count": 35 }
    ],
    "topSpecialists": [
      { "recommended_specialist": "General Physician", "count": 60 },
      { "recommended_specialist": "Cardiologist", "count": 30 }
    ],
    "recentChecks": 45
  }
}
```

---

## 🧪 Testing with Postman

### Import Collection

You can manually create requests in Postman using the endpoints above.

### Sample Test Cases

#### Test 1: Doctor Scheduling

1. GET all doctors → Should return list
2. GET doctor/1 schedule → Should return schedule
3. POST create schedule → Should create successfully
4. PUT update schedule → Should update successfully
5. DELETE schedule → Should delete successfully

#### Test 2: Symptom Checker

1. POST symptom check with symptoms → Should return AI analysis
2. GET symptom history → Should return records
3. POST quick triage → Should return urgency level
4. GET statistics → Should return stats

---

## 📸 Required Screenshots for Submission

For each API endpoint, take Postman screenshots showing:

1. Request URL and Method
2. Request Headers
3. Request Body (if applicable)
4. Response Status Code
5. Response Body

**Total Screenshots Needed:** Minimum 10 (5 per feature)

---

## 🎯 Assignment Requirements Checklist

✅ **Two Features Implemented:**

- AI Symptom Checker & Triage System
- Doctor Scheduling & Availability Management

✅ **REST API Endpoints:** 11 total endpoints

✅ **Database Connection:** TiDB Cloud MySQL

- Multiple endpoints perform database queries
- CRUD operations implemented

✅ **Server Port:** 1355 (last 4 digits of 23201355)

✅ **Code Structure:**

- Separate folders for routes, controllers, models, utils
- Clean, organized codebase

✅ **External API Integration:**

- Groq AI API for symptom analysis

✅ **Frontend:** React with TailwindCSS

✅ **Testing:** Ready for Postman testing

✅ **Documentation:** Complete API documentation

---

## 🔧 Troubleshooting

### Backend won't start

- Check if `.env` file exists and has correct credentials
- Verify TiDB Cloud credentials
- Check if port 1355 is available

### Database connection fails

- Verify TiDB Cloud cluster is running
- Check firewall settings
- Ensure SSL is enabled in config

### AI API not working

- Verify Groq API key is correct
- Check if you have API credits
- Review error messages in console

### Frontend can't connect to backend

- Ensure backend is running on port 1355
- Check CORS configuration
- Verify API_BASE_URL in `frontend/src/services/api.js`

---

## 📚 Additional Resources

- **TiDB Cloud Docs:** https://docs.pingcap.com/tidbcloud/
- **Groq API Docs:** https://console.groq.com/docs
- **React Docs:** https://react.dev/
- **Express Docs:** https://expressjs.com/

---

## 👨‍💻 Author

**MD Shafiur Rahman Alvi**
Student ID: 23201355
Group: 08 | Section: 08
CSE471 - System Analysis and Design
Spring 2026

---

## 📄 License

This project is submitted as part of CSE471 Lab Assignment 3.

---

**Note:** This is an educational project and should not be used for actual medical diagnosis. Always consult qualified healthcare professionals for medical advice.
