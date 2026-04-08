# MediAI SmartCare - Database & API Documentation

## Doctor Scheduling & Availability Management Feature

**Student:** MD Shafiur Rahman Alvi (ID: 23201355)  
**Course:** CSE471 - Lab Assignment 3  
**Last Updated:** April 2026

---

## 📊 DATABASE INFORMATION

### Database Type

- **Database:** SQLite 3
- **Driver:** better-sqlite3 (Node.js)
- **Location:** `/backend/mediai_smartcare.db`
- **Configuration:** `/backend/config/database.js`

### Why SQLite?

- ✅ Lightweight and perfect for single-server deployments
- ✅ Zero configuration required
- ✅ ACID compliant (reliable transactions)
- ✅ Cross-platform compatibility
- ✅ Embedded database (no separate server process)
- ✅ Fast read operations for appointment lookups

### Database Connection

```javascript
// File: backend/config/database.js
const Database = require("better-sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "..", "mediai_smartcare.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON"); // Enable referential integrity
module.exports = db;
```

---

## 🗄️ DATABASE SCHEMA

### Table 1: `doctors`

Stores doctor information and credentials.

| Column             | Type    | Constraints               | Description                          |
| ------------------ | ------- | ------------------------- | ------------------------------------ |
| `doctor_id`        | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique doctor identifier             |
| `name`             | TEXT    | NOT NULL                  | Doctor's full name (Bengali/English) |
| `email`            | TEXT    | UNIQUE NOT NULL           | Login email address                  |
| `phone`            | TEXT    | -                         | Contact number (+880 format)         |
| `specialization`   | TEXT    | NOT NULL                  | Medical specialty                    |
| `department`       | TEXT    | NOT NULL                  | Hospital department                  |
| `qualification`    | TEXT    | -                         | Medical degrees (MBBS, MD, FCPS)     |
| `experience_years` | INTEGER | DEFAULT 0                 | Years of experience                  |
| `consultation_fee` | REAL    | DEFAULT 500.00            | Fee in BDT (৳)                       |
| `is_available`     | INTEGER | DEFAULT 1                 | 1=active, 0=inactive                 |
| `created_at`       | TEXT    | DEFAULT CURRENT_TIMESTAMP | Record creation time                 |
| `updated_at`       | TEXT    | DEFAULT CURRENT_TIMESTAMP | Last update time                     |

**Sample Data (15 doctors total, 10 Bengali):**

```sql
-- Bengali Doctor Example
INSERT INTO doctors VALUES (
  6,
  'ডাঃ রহিম উদ্দিন চৌধুরী (Dr. Rahim Uddin Chowdhury)',
  'dr.rahim.chowdhury@mediai.com',
  '+880 1711-123456',
  'Cardiologist',
  'Cardiology',
  'MBBS, MD (Cardiology), FCPS',
  15,
  1500.00,
  1,
  '2026-04-07 21:30:00',
  '2026-04-07 21:30:00'
);
```

---

### Table 2: `doctor_schedules`

Defines recurring weekly availability schedules for doctors.

| Column          | Type    | Constraints                                        | Description                             |
| --------------- | ------- | -------------------------------------------------- | --------------------------------------- |
| `schedule_id`   | INTEGER | PRIMARY KEY AUTOINCREMENT                          | Unique schedule identifier              |
| `doctor_id`     | INTEGER | FOREIGN KEY → doctors(doctor_id) ON DELETE CASCADE | Links to doctor                         |
| `day_of_week`   | TEXT    | CHECK(day_of_week IN ('Monday', 'Tuesday', ...))   | Day name                                |
| `start_time`    | TEXT    | NOT NULL                                           | Start time (HH:MM:SS format)            |
| `end_time`      | TEXT    | NOT NULL                                           | End time (HH:MM:SS format)              |
| `slot_duration` | INTEGER | DEFAULT 30                                         | Appointment duration in minutes (15-60) |
| `is_active`     | INTEGER | DEFAULT 1                                          | 1=active, 0=soft-deleted                |
| `created_at`    | TEXT    | DEFAULT CURRENT_TIMESTAMP                          | Record creation time                    |
| `updated_at`    | TEXT    | DEFAULT CURRENT_TIMESTAMP                          | Last update time                        |

**Constraints:**

- `UNIQUE (doctor_id, day_of_week, start_time)` - Prevents duplicate schedules
- `CHECK` constraint on `day_of_week` - Only valid weekday names
- `FOREIGN KEY` with `ON DELETE CASCADE` - Deletes schedules when doctor is deleted

**Sample Data (55 schedules total, 37 for Bengali doctors):**

```sql
-- Example: Dr. Rahim's Monday morning shift
INSERT INTO doctor_schedules VALUES (
  19,
  6,
  'Monday',
  '09:00:00',
  '13:00:00',
  30,
  1,
  '2026-04-07 21:30:00',
  '2026-04-07 21:30:00'
);
```

**Schedule Interpretation:**

- Doctor ID 6 (Dr. Rahim) is available every Monday from 9 AM to 1 PM
- Generates 8 appointment slots: 9:00, 9:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30
- Each slot is 30 minutes long

---

### Table 3: `time_slots` (Optional - for booking management)

Tracks individual appointment slots for specific dates.

| Column          | Type    | Constraints                                        | Description                |
| --------------- | ------- | -------------------------------------------------- | -------------------------- |
| `slot_id`       | INTEGER | PRIMARY KEY AUTOINCREMENT                          | Unique slot identifier     |
| `doctor_id`     | INTEGER | FOREIGN KEY → doctors(doctor_id) ON DELETE CASCADE | Links to doctor            |
| `schedule_date` | TEXT    | NOT NULL                                           | Specific date (YYYY-MM-DD) |
| `start_time`    | TEXT    | NOT NULL                                           | Slot start time            |
| `end_time`      | TEXT    | NOT NULL                                           | Slot end time              |
| `is_booked`     | INTEGER | DEFAULT 0                                          | 0=available, 1=booked      |
| `created_at`    | TEXT    | DEFAULT CURRENT_TIMESTAMP                          | Slot creation time         |

**Purpose:** Prevents double-booking by tracking individual slot availability.

**Usage Flow:**

1. Generate slots from `doctor_schedules` for next 30 days
2. Insert into `time_slots` with `is_booked = 0`
3. When patient books, update `is_booked = 1` for that slot
4. Frontend queries `time_slots` to show available slots only

**Note:** This table exists in schema but is NOT currently used by the application. It's ready for future appointment booking implementation.

---

### Table 4: `symptom_checks`

Stores AI-based symptom analysis records (separate feature).

---

## 🔌 BACKEND API ENDPOINTS

### Base URL

```
http://localhost:1355/api
```

### Port Configuration

- **Port:** 1355 (last 4 digits of student ID 23201355)
- **CORS:** Enabled for `http://localhost:5173` (frontend)

---

### 1. Get All Available Doctors

**Endpoint:** `GET /api/schedule/doctors`

**Purpose:** Retrieve list of all active doctors

**Controller Function:** `getAllDoctors()` in `/controllers/scheduleController.js`

**Database Query:**

```sql
SELECT
  doctor_id, name, email, phone, specialization,
  department, qualification, experience_years,
  consultation_fee, is_available
FROM doctors
WHERE is_available = 1
ORDER BY name
```

**Response Example:**

```json
{
  "success": true,
  "count": 15,
  "doctors": [
    {
      "doctor_id": 6,
      "name": "ডাঃ রহিম উদ্দিন চৌধুরী (Dr. Rahim Uddin Chowdhury)",
      "email": "dr.rahim.chowdhury@mediai.com",
      "phone": "+880 1711-123456",
      "specialization": "Cardiologist",
      "department": "Cardiology",
      "qualification": "MBBS, MD (Cardiology), FCPS",
      "experience_years": 15,
      "consultation_fee": 1500,
      "is_available": 1
    }
  ]
}
```

**Use Case:** Patient views list of all doctors on the homepage

---

### 2. Search Doctors by Specialty/Department

**Endpoint:** `GET /api/schedule/doctors/search`

**Query Parameters:**

- `specialization` (optional) - Filter by specialty (e.g., "Cardiologist")
- `department` (optional) - Filter by department (e.g., "Cardiology")

**Controller Function:** `searchDoctors()` in `/controllers/scheduleController.js`

**Database Query:**

```sql
SELECT * FROM doctors
WHERE is_available = 1
AND (specialization LIKE '%Cardiologist%' OR department LIKE '%Cardiology%')
ORDER BY name
```

**Example Requests:**

```
GET /api/schedule/doctors/search?specialization=Cardiologist
GET /api/schedule/doctors/search?department=Pediatrics
GET /api/schedule/doctors/search?specialization=Neuro&department=Neurology
```

**Response Example:**

```json
{
  "success": true,
  "count": 2,
  "doctors": [
    {
      "doctor_id": 6,
      "name": "ডাঃ রহিম উদ্দিন চৌধুরী (Dr. Rahim Uddin Chowdhury)",
      "specialization": "Cardiologist",
      "department": "Cardiology",
      "consultation_fee": 1500
    }
  ]
}
```

**Use Case:** Patient searches for a specific type of doctor

---

### 3. Get Doctor's Schedule

**Endpoint:** `GET /api/schedule/doctors/:doctorId`

**URL Parameter:**

- `doctorId` - Doctor's unique ID (integer)

**Controller Function:** `getDoctorSchedule()` in `/controllers/scheduleController.js`

**Database Queries:**

```sql
-- Query 1: Get doctor info
SELECT * FROM doctors WHERE doctor_id = ? AND is_available = 1

-- Query 2: Get doctor's schedules
SELECT
  schedule_id, day_of_week, start_time, end_time,
  slot_duration, is_active
FROM doctor_schedules
WHERE doctor_id = ? AND is_active = 1
ORDER BY
  CASE day_of_week
    WHEN 'Saturday' THEN 1
    WHEN 'Sunday' THEN 2
    WHEN 'Monday' THEN 3
    WHEN 'Tuesday' THEN 4
    WHEN 'Wednesday' THEN 5
    WHEN 'Thursday' THEN 6
    WHEN 'Friday' THEN 7
  END,
  start_time
```

**Example Request:**

```
GET /api/schedule/doctors/6
```

**Response Example:**

```json
{
  "success": true,
  "doctor": {
    "doctor_id": 6,
    "name": "ডাঃ রহিম উদ্দিন চৌধুরী (Dr. Rahim Uddin Chowdhury)",
    "specialization": "Cardiologist",
    "consultation_fee": 1500,
    "experience_years": 15
  },
  "schedules": [
    {
      "schedule_id": 21,
      "day_of_week": "Saturday",
      "start_time": "14:00:00",
      "end_time": "18:00:00",
      "slot_duration": 30,
      "is_active": 1
    },
    {
      "schedule_id": 19,
      "day_of_week": "Monday",
      "start_time": "09:00:00",
      "end_time": "13:00:00",
      "slot_duration": 30,
      "is_active": 1
    }
  ]
}
```

**Use Case:** Patient clicks on a doctor to view their weekly schedule

---

### 4. Create Doctor Schedule

**Endpoint:** `POST /api/schedule/create`

**Request Body:**

```json
{
  "doctorId": 6,
  "dayOfWeek": "Tuesday",
  "startTime": "10:00:00",
  "endTime": "14:00:00",
  "slotDuration": 30
}
```

**Controller Function:** `createDoctorSchedule()` in `/controllers/scheduleController.js`

**Validation Checks:**

1. All required fields present
2. `startTime` < `endTime`
3. `slotDuration` between 15-60 minutes
4. No schedule conflict (overlapping times)

**Conflict Detection Query:**

```sql
SELECT schedule_id FROM doctor_schedules
WHERE doctor_id = ?
AND day_of_week = ?
AND is_active = 1
AND (
  (start_time <= ? AND end_time > ?) OR      -- New starts before existing ends
  (start_time < ? AND end_time >= ?) OR      -- New ends after existing starts
  (start_time >= ? AND end_time <= ?)        -- New completely within existing
)
```

**Insert Query (if no conflict):**

```sql
INSERT INTO doctor_schedules
  (doctor_id, day_of_week, start_time, end_time, slot_duration)
VALUES (?, ?, ?, ?, ?)
```

**Success Response:**

```json
{
  "success": true,
  "message": "Schedule created successfully",
  "schedule": {
    "schedule_id": 56,
    "doctor_id": 6,
    "day_of_week": "Tuesday",
    "start_time": "10:00:00",
    "end_time": "14:00:00",
    "slot_duration": 30
  }
}
```

**Error Response (409 Conflict):**

```json
{
  "success": false,
  "message": "Schedule conflict detected. This time slot overlaps with existing schedule."
}
```

**Use Case:** Doctor/admin adds a new availability slot

---

### 5. Update Doctor Schedule

**Endpoint:** `PUT /api/schedule/:scheduleId`

**URL Parameter:**

- `scheduleId` - Schedule's unique ID

**Request Body:**

```json
{
  "startTime": "11:00:00",
  "endTime": "15:00:00",
  "slotDuration": 45,
  "isActive": 1
}
```

**Controller Function:** `updateDoctorSchedule()` in `/controllers/scheduleController.js`

**Update Query:**

```sql
UPDATE doctor_schedules
SET start_time = ?,
    end_time = ?,
    slot_duration = ?,
    is_active = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE schedule_id = ?
```

**Success Response:**

```json
{
  "success": true,
  "message": "Schedule updated successfully"
}
```

**Use Case:** Doctor adjusts their working hours or slot duration

---

### 6. Delete Doctor Schedule

**Endpoint:** `DELETE /api/schedule/:scheduleId`

**URL Parameter:**

- `scheduleId` - Schedule's unique ID

**Controller Function:** `deleteDoctorSchedule()` in `/controllers/scheduleController.js`

**Soft Delete Query:**

```sql
UPDATE doctor_schedules
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE schedule_id = ?
```

**Note:** This is a "soft delete" - the record remains in the database but won't appear in queries.

**Success Response:**

```json
{
  "success": true,
  "message": "Schedule deleted successfully"
}
```

**Use Case:** Doctor removes an availability slot

---

## 🔄 DATA FLOW DIAGRAMS

### Flow 1: Patient Searches for a Doctor

```
┌─────────────┐
│   Patient   │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Opens Doctor Schedule page
       ▼
┌──────────────────────────────────┐
│  DoctorSchedule.jsx Component    │
│  (React Frontend)                │
└──────┬───────────────────────────┘
       │
       │ 2. useEffect on mount
       │ axios.get('/api/schedule/doctors')
       ▼
┌──────────────────────────────────┐
│  Express Server (Port 1355)      │
│  Route: GET /api/schedule/doctors│
└──────┬───────────────────────────┘
       │
       │ 3. Calls scheduleController.getAllDoctors()
       ▼
┌──────────────────────────────────┐
│  scheduleController.js           │
│  - Imports db from config/       │
│    database.js                   │
│  - Executes SQL query            │
└──────┬───────────────────────────┘
       │
       │ 4. SQL: SELECT * FROM doctors WHERE is_available = 1
       ▼
┌──────────────────────────────────┐
│  mediai_smartcare.db (SQLite)    │
│  Table: doctors                  │
└──────┬───────────────────────────┘
       │
       │ 5. Returns 15 doctor records
       ▼
┌──────────────────────────────────┐
│  Controller processes data       │
│  Returns JSON response           │
└──────┬───────────────────────────┘
       │
       │ 6. HTTP 200 with doctor list
       ▼
┌──────────────────────────────────┐
│  Frontend receives data          │
│  setDoctors(response.data.doctors)│
└──────┬───────────────────────────┘
       │
       │ 7. Renders doctor cards
       ▼
┌──────────────────────────────────┐
│  Patient sees doctor list        │
│  - Name (Bengali/English)        │
│  - Specialization                │
│  - Consultation Fee              │
│  - Department                    │
└──────────────────────────────────┘
```

---

### Flow 2: Doctor Creates New Schedule (Conflict Prevention)

```
┌─────────────┐
│   Doctor    │
│ (Moderator) │
└──────┬──────┘
       │
       │ 1. Clicks "+ Add Schedule" button
       ▼
┌──────────────────────────────────┐
│  DoctorSchedule.jsx              │
│  - Shows form                    │
│  - Fields: Day, Start, End, Slot │
└──────┬───────────────────────────┘
       │
       │ 2. Fills form and clicks "Create Schedule"
       │ handleCreateSchedule()
       │ axios.post('/api/schedule/create', formData)
       ▼
┌──────────────────────────────────┐
│  Express Server                  │
│  Route: POST /api/schedule/create│
└──────┬───────────────────────────┘
       │
       │ 3. Calls scheduleController.createDoctorSchedule()
       ▼
┌──────────────────────────────────┐
│  scheduleController.js           │
│  Step 1: Validate input fields   │
└──────┬───────────────────────────┘
       │
       │ 4. Validate: startTime < endTime?
       │    Validate: 15 <= slotDuration <= 60?
       ▼
┌──────────────────────────────────┐
│  Step 2: Check for conflicts     │
│  SQL Query:                      │
│  SELECT * FROM doctor_schedules  │
│  WHERE doctor_id = ?             │
│  AND day_of_week = ?             │
│  AND time ranges overlap         │
└──────┬───────────────────────────┘
       │
       ├──────────┬──────────────────┐
       │          │                  │
  ❌ CONFLICT   ✅ NO CONFLICT      │
       │          │                  │
       │          │ 5. Insert new schedule
       │          │ INSERT INTO doctor_schedules
       │          │ VALUES (...)
       │          ▼
       │     ┌──────────────────────┐
       │     │ SQLite Database      │
       │     │ - Enforces UNIQUE    │
       │     │   constraint         │
       │     │ - Runs INSERT        │
       │     └──────┬───────────────┘
       │            │
       │            │ 6. Returns new schedule_id
       │            ▼
       │     ┌──────────────────────┐
       │     │ Controller returns   │
       │     │ HTTP 201 Created     │
       │     └──────┬───────────────┘
       │            │
       ▼            ▼
┌──────────┐  ┌──────────────────┐
│ Return   │  │ Frontend receives│
│ HTTP 409 │  │ success response │
│ Conflict │  │ Shows success    │
│ Error    │  │ message          │
└────┬─────┘  └────┬─────────────┘
     │             │
     │             │ 7. Refresh doctor schedule
     │             │ GET /api/schedule/doctors/:id
     │             ▼
     │        ┌──────────────────┐
     │        │ Updated schedule │
     │        │ displayed        │
     │        └──────────────────┘
     │
     ▼
┌──────────────────┐
│ Show error alert │
│ "Schedule        │
│  conflict!"      │
└──────────────────┘
```

---

### Flow 3: Conflict Prevention Logic (Detailed)

**Scenario:** Dr. Rahim (ID=6) has existing schedule:

- **Existing:** Monday 09:00-13:00 (Schedule ID 19)

**Attempt 1:** Create Monday 10:00-12:00 ❌

```sql
-- Conflict Check Query
SELECT schedule_id FROM doctor_schedules
WHERE doctor_id = 6
AND day_of_week = 'Monday'
AND is_active = 1
AND (
  -- Condition 1: New starts before existing ends
  (start_time <= '10:00:00' AND end_time > '10:00:00') -- 09:00 <= 10:00 AND 13:00 > 10:00 ✓ MATCH
  OR
  -- Condition 2: New ends after existing starts
  (start_time < '12:00:00' AND end_time >= '12:00:00') -- 09:00 < 12:00 AND 13:00 >= 12:00 ✓ MATCH
  OR
  -- Condition 3: New completely within existing
  (start_time >= '10:00:00' AND end_time <= '12:00:00') -- 09:00 >= 10:00 (X)
)

-- Result: schedule_id = 19 found
-- Action: Return HTTP 409 "Schedule conflict detected"
```

**Attempt 2:** Create Monday 14:00-18:00 ✅

```sql
-- Conflict Check Query
SELECT schedule_id FROM doctor_schedules
WHERE doctor_id = 6
AND day_of_week = 'Monday'
AND is_active = 1
AND (
  (start_time <= '14:00:00' AND end_time > '14:00:00') -- 09:00 <= 14:00 BUT 13:00 > 14:00? NO
  OR
  (start_time < '18:00:00' AND end_time >= '18:00:00') -- 09:00 < 18:00 BUT 13:00 >= 18:00? NO
  OR
  (start_time >= '14:00:00' AND end_time <= '18:00:00') -- 09:00 >= 14:00? NO
)

-- Result: No schedule_id found (empty result)
-- Action: Proceed with INSERT
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration)
VALUES (6, 'Monday', '14:00:00', '18:00:00', 30)
-- Returns: schedule_id = 56, HTTP 201 Created
```

---

## 🖥️ FRONTEND ARCHITECTURE

### Technology Stack

- **Framework:** React 18.2.0
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **Styling:** TailwindCSS
- **Dev Server:** `http://localhost:5173`

### Component Structure

```
frontend/src/
├── App.jsx                  # Main app with tab navigation
├── components/
│   ├── DoctorSchedule.jsx   # Doctor scheduling interface
│   └── SymptomChecker.jsx   # AI symptom checker (separate feature)
├── services/
│   └── api.js               # Axios API client wrapper
├── index.css                # Tailwind CSS imports
└── main.jsx                 # React app entry point
```

---

### DoctorSchedule.jsx (Unified Interface)

**Current Implementation:** Single component serving both roles

- ✅ **Patient View:** Browse doctors, view schedules
- ✅ **Doctor/Admin View:** Create, update, delete schedules

**File:** `/frontend/src/components/DoctorSchedule.jsx` (390 lines)

**Component State:**

```javascript
const [doctors, setDoctors] = useState([]); // All doctors list
const [selectedDoctor, setSelectedDoctor] = useState(null); // Selected doctor object
const [schedules, setSchedules] = useState([]); // Selected doctor's schedules
const [searchQuery, setSearchQuery] = useState(""); // Search input
const [showAddForm, setShowAddForm] = useState(false); // Toggle schedule form
const [loading, setLoading] = useState(false); // Loading spinner
const [error, setError] = useState(null); // Error messages
```

**Key Functions:**

1. **fetchDoctors()** - Called on component mount
   - API: `GET /api/schedule/doctors`
   - Updates `doctors` state
   - Displays loading spinner during fetch

2. **handleSearch()** - Search by specialization
   - API: `GET /api/schedule/doctors/search?specialization={query}`
   - Filters doctor list by specialty
   - Clears search if query empty

3. **handleDoctorSelect(doctorId)** - Select doctor to view schedule
   - API: `GET /api/schedule/doctors/${doctorId}`
   - Updates `selectedDoctor` and `schedules` states
   - Displays doctor info + weekly schedule grid

4. **handleCreateSchedule(formData)** - Create new schedule
   - API: `POST /api/schedule/create`
   - Validates form inputs client-side
   - Shows success/error alerts
   - Refreshes schedule list on success

5. **handleDeleteSchedule(scheduleId)** - Delete schedule
   - Shows browser confirmation dialog
   - API: `DELETE /api/schedule/${scheduleId}`
   - Refreshes schedule list on success

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  🏥 Doctor Scheduling & Availability Management             │
│  Manage doctor schedules and view availability              │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌─────────────────────────────────┐
│  DOCTORS             │  │  Select a doctor to view        │
│  ┌────────────────┐  │  │  their schedule                 │
│  │ Search by      │  │  │                                 │
│  │ specialization │  │  │  (Empty state placeholder)      │
│  └────────────────┘  │  │                                 │
│                      │  │                                 │
│  ┌────────────────┐  │  └─────────────────────────────────┘
│  │ 👨‍⚕️ Dr. Rahim    │  │
│  │ Cardiologist   │  │  (When doctor selected:)
│  │ Cardiology     │  │
│  │ ৳1500          │◄─┼─►┌─────────────────────────────────┐
│  └────────────────┘  │  │ 👨‍⚕️ Dr. Rahim Uddin Chowdhury   │
│                      │  │ Cardiologist | 15 years exp    │
│  ┌────────────────┐  │  │ Qualification: MBBS, MD, FCPS  │
│  │ 👩‍⚕️ Dr. Nasrin  │  │ ৳1500 per consultation          │
│  │ Gynecologist   │  │  │                                 │
│  │ Obstetrics     │  │  │ [+ Add Schedule]                │
│  │ ৳1200          │  │  │                                 │
│  └────────────────┘  │  │ ┌─────────────┬───────────────┐ │
│  ...                 │  │ │ Monday      │ Wednesday     │ │
└──────────────────────┘  │ │ 09:00-13:00 │ 09:00-13:00   │ │
                          │ │ 30 min slots│ 30 min slots  │ │
                          │ │ [Delete]    │ [Delete]      │ │
                          │ └─────────────┴───────────────┘ │
                          │ ┌─────────────┐                │
                          │ │ Saturday    │                │
                          │ │ 14:00-18:00 │                │
                          │ │ 30 min slots│                │
                          │ │ [Delete]    │                │
                          │ └─────────────┘                │
                          └─────────────────────────────────┘
```

---

### Proposed: Two Separate Pages

**Your Requirement:** Split into doctor/moderator page and patient page

#### Option A: Two Separate Components

**File Structure:**

```
frontend/src/components/
├── PatientScheduleView.jsx    # Patient-facing interface
└── DoctorScheduleManage.jsx   # Doctor/admin interface
```

**PatientScheduleView.jsx Features:**

- ✅ Search doctors by specialization/department/name
- ✅ View doctor profiles (name, photo, qualifications, fee)
- ✅ View weekly schedule availability
- ✅ **NEW:** Book appointment form
  - Select date from calendar
  - Choose available time slot
  - Enter patient info (name, age, phone, symptoms)
  - Submit booking request
- ✅ **NEW:** View booked appointments (patient dashboard)
- ❌ No create/update/delete schedule buttons

**DoctorScheduleManage.jsx Features:**

- ✅ View own profile and statistics
- ✅ Create new schedule slots
- ✅ Update existing schedules
- ✅ Delete/deactivate schedules
- ✅ **NEW:** View incoming appointment requests
- ✅ **NEW:** Approve/reject appointment bookings
- ✅ **NEW:** View appointment history
- ❌ No patient search functionality (only own data)

#### Option B: Role-Based Access Control

**Single Component with Role Detection:**

```javascript
// DoctorSchedule.jsx
const DoctorSchedule = ({ userRole }) => {
  if (userRole === "doctor" || userRole === "admin") {
    return <DoctorScheduleManage />;
  } else {
    return <PatientScheduleView />;
  }
};
```

**Requires:**

- User authentication system
- Role assignment (patient/doctor/admin)
- Protected routes

---

## 🛡️ CONFLICT PREVENTION MECHANISMS

### Layer 1: Backend Validation (Primary)

**Location:** `/backend/controllers/scheduleController.js` lines 130-149

**SQL Conflict Check:**

```sql
SELECT schedule_id FROM doctor_schedules
WHERE doctor_id = ?
AND day_of_week = ?
AND is_active = 1
AND (
  -- Overlap Condition 1: New schedule starts before existing ends
  (start_time <= ? AND end_time > ?)
  OR
  -- Overlap Condition 2: New schedule ends after existing starts
  (start_time < ? AND end_time >= ?)
  OR
  -- Overlap Condition 3: New schedule completely within existing
  (start_time >= ? AND end_time <= ?)
)
```

**Logic Explanation:**

**Existing Schedule:** Monday 09:00-13:00

| New Schedule | Condition 1                             | Condition 2                             | Condition 3                              | Result             |
| ------------ | --------------------------------------- | --------------------------------------- | ---------------------------------------- | ------------------ |
| 08:00-10:00  | 09:00 <= 08:00 (❌)                     | 09:00 < 10:00 ✓ AND 13:00 >= 10:00 ✓    | 09:00 >= 08:00 ✓ AND 13:00 <= 10:00 (❌) | **CONFLICT**       |
| 10:00-12:00  | 09:00 <= 10:00 ✓ AND 13:00 > 10:00 ✓    | -                                       | -                                        | **CONFLICT**       |
| 12:00-15:00  | 09:00 <= 12:00 ✓ AND 13:00 > 12:00 ✓    | -                                       | -                                        | **CONFLICT**       |
| 14:00-18:00  | 09:00 <= 14:00 ✓ BUT 13:00 > 14:00 (❌) | 09:00 < 18:00 ✓ BUT 13:00 >= 18:00 (❌) | 09:00 >= 14:00 (❌)                      | **NO CONFLICT** ✅ |
| 07:00-08:00  | All conditions false                    | -                                       | -                                        | **NO CONFLICT** ✅ |

**Return Value:**

- If conflict found: HTTP 409 with error message
- If no conflict: Proceed to INSERT

---

### Layer 2: Database Constraints (Secondary)

**Location:** `/backend/initDatabase.js` line 39

**UNIQUE Constraint:**

```sql
UNIQUE (doctor_id, day_of_week, start_time)
```

**Purpose:** Prevents exact duplicate schedules at database level

**Example:**

- Existing: Doctor 6, Monday, 09:00-13:00
- Attempt: Doctor 6, Monday, 09:00-14:00
- Result: `SQLITE_CONSTRAINT: UNIQUE constraint failed`

**Note:** This catches duplicates but not overlaps (e.g., 09:30-13:30 would pass this constraint but be caught by Layer 1).

---

### Layer 3: Frontend Validation (Tertiary)

**Location:** `/frontend/src/components/DoctorSchedule.jsx` lines 52-78

**Client-Side Checks:**

```javascript
const handleCreateSchedule = async (e) => {
  e.preventDefault();

  // Required field validation
  if (!formData.dayOfWeek || !formData.startTime || !formData.endTime) {
    alert("Please fill all fields");
    return;
  }

  // Time validation
  if (formData.startTime >= formData.endTime) {
    alert("Start time must be before end time");
    return;
  }

  // Slot duration validation
  if (formData.slotDuration < 15 || formData.slotDuration > 60) {
    alert("Slot duration must be between 15-60 minutes");
    return;
  }

  // API call...
};
```

**User Experience Benefits:**

- Instant feedback (no API roundtrip)
- Prevents unnecessary network requests
- Reduces server load

**⚠️ Important:** Frontend validation is NOT secure (can be bypassed). Backend validation is mandatory.

---

### Layer 4: Time Slots Table (Future Enhancement)

**Location:** `time_slots` table in database schema

**Concept:** Track individual appointment slots for specific dates

**Example Workflow:**

1. **Generate Slots from Schedule:**

```sql
-- Dr. Rahim has Monday 09:00-13:00 with 30-min slots
-- For date 2026-04-14 (Monday), generate:
INSERT INTO time_slots (doctor_id, schedule_date, start_time, end_time, is_booked) VALUES
(6, '2026-04-14', '09:00:00', '09:30:00', 0),
(6, '2026-04-14', '09:30:00', '10:00:00', 0),
(6, '2026-04-14', '10:00:00', '10:30:00', 0),
(6, '2026-04-14', '10:30:00', '11:00:00', 0),
(6, '2026-04-14', '11:00:00', '11:30:00', 0),
(6, '2026-04-14', '11:30:00', '12:00:00', 0),
(6, '2026-04-14', '12:00:00', '12:30:00', 0),
(6, '2026-04-14', '12:30:00', '13:00:00', 0)
```

2. **Patient Books Slot:**

```sql
-- Patient selects April 14, 10:00 AM
UPDATE time_slots
SET is_booked = 1
WHERE doctor_id = 6
AND schedule_date = '2026-04-14'
AND start_time = '10:00:00'
```

3. **Check Availability:**

```sql
-- Show only available slots
SELECT * FROM time_slots
WHERE doctor_id = 6
AND schedule_date = '2026-04-14'
AND is_booked = 0
ORDER BY start_time
```

**Benefits:**

- Prevents double-booking at slot level
- Allows easy cancellation tracking
- Supports walk-in appointment management

**Current Status:** ⚠️ Table exists but NOT used by application yet.

---

## 📝 SUMMARY FOR YOUR PROFESSOR

### Database Questions Answered

**Q: Is the database working?**  
✅ **Yes.** Database is fully operational with 15 doctors and 55 schedules (including 10 Bengali doctors with 37 schedules).

**Q: Is it SQLite?**  
✅ **Yes.** Using SQLite 3 with `better-sqlite3` Node.js driver.

**Q: Which action calls which API?**

| User Action                 | API Endpoint                                                   | Database Tables                         |
| --------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| Opens doctor list page      | `GET /api/schedule/doctors`                                    | `doctors`                               |
| Searches for "Cardiologist" | `GET /api/schedule/doctors/search?specialization=Cardiologist` | `doctors`                               |
| Clicks on a doctor card     | `GET /api/schedule/doctors/6`                                  | `doctors`, `doctor_schedules`           |
| Doctor adds new schedule    | `POST /api/schedule/create`                                    | `doctor_schedules` (INSERT)             |
| Doctor updates schedule     | `PUT /api/schedule/56`                                         | `doctor_schedules` (UPDATE)             |
| Doctor deletes schedule     | `DELETE /api/schedule/56`                                      | `doctor_schedules` (UPDATE is_active=0) |

**Q: How does the database work?**

1. **Backend starts** → Loads `config/database.js` → Opens SQLite file
2. **API request arrives** → Routes to controller function
3. **Controller** → Executes SQL query using `better-sqlite3`
4. **SQLite** → Returns data from `.db` file
5. **Controller** → Formats as JSON response
6. **Frontend** → Displays data to user

**Data Flow Example:**

```
Patient Browser → Axios (React)
    ↓
Express API (Node.js)
    ↓
scheduleController.js
    ↓
database.js (better-sqlite3)
    ↓
mediai_smartcare.db (SQLite file)
    ↓
Returns doctor records
    ↓
JSON response to browser
    ↓
React renders doctor cards
```

---

## 🇧🇩 BENGALI DUMMY DATA SUMMARY

### Doctors Added

- **ডাঃ রহিম উদ্দিন চৌধুরী** - Cardiologist (৳1500)
- **ডাঃ নাসরীন সুলতানা** - Gynecologist (৳1200)
- **ডাঃ কামরুল ইসলাম** - Orthopedic Surgeon (৳1300)
- **ডাঃ শাহনাজ পারভীন** - Pediatrician (৳900)
- **ডাঃ তারেক আজিজ খান** - Neurologist (৳1600)
- **ডাঃ ফাতেমা বেগম** - Dermatologist (৳1000)
- **ডাঃ হাসান মাহমুদ** - General Physician (৳600)
- **ডাঃ রুমানা আক্তার** - Psychiatrist (৳1100)
- **ডাঃ শফিক হোসেন** - ENT Specialist (৳1000)
- **ডাঃ সাবিনা ইয়াসমিন** - Ophthalmologist (৳1200)

### Schedules Created

- **37 schedule slots** across all Bengali doctors
- **Schedule distribution:** Monday (10), Tuesday (10), Wednesday (9), Thursday (8), Friday (6), Saturday (5), Sunday (7)
- **Slot durations:** 15-60 minutes depending on specialization
- **Time ranges:** Morning (08:00-14:00), Afternoon (14:00-19:00), Evening (16:00-20:00)

---

## 🚀 NEXT STEPS (RECOMMENDED ENHANCEMENTS)

### 1. Separate Patient and Doctor Pages

**Create PatientScheduleView.jsx:**

- Move search and browse functionality
- Add appointment booking form
- Add date picker for slot selection
- Add patient information form

**Create DoctorScheduleManage.jsx:**

- Keep create/update/delete schedule functionality
- Add appointment request management
- Add dashboard with statistics
- Add calendar view of appointments

### 2. Implement Appointment Booking System

**Backend Changes:**

- Create `appointments` table
- Create API endpoints: `/api/appointments/create`, `/api/appointments/list`
- Generate time slots from schedules
- Update `time_slots` table on booking

**Frontend Changes:**

- Add date picker component
- Show available time slots for selected date
- Add booking form with patient details
- Show booking confirmation

### 3. Add User Authentication

**Backend:**

- Create `users` table
- Implement JWT authentication
- Role-based access control (patient/doctor/admin)

**Frontend:**

- Login/Register pages
- Protected routes
- User session management

### 4. Add Real-Time Availability

**Features:**

- WebSocket connection for live slot updates
- Notification when slot becomes available
- Auto-refresh appointment lists

---

## 📞 CONTACT

**Student:** MD Shafiur Rahman Alvi  
**Student ID:** 23201355  
**Course:** CSE471 - System Analysis and Design Lab  
**Assignment:** Lab Assignment 3  
**Project:** MediAI SmartCare - AI-Integrated Hospital Management System

**Files to Check:**

- Database: `/backend/mediai_smartcare.db`
- Backend: `/backend/server.js`, `/backend/controllers/scheduleController.js`
- Frontend: `/frontend/src/components/DoctorSchedule.jsx`
- Docs: `/DATABASE_AND_API_DOCUMENTATION.md`

---

**Last Updated:** April 7, 2026  
**Documentation Version:** 1.0
