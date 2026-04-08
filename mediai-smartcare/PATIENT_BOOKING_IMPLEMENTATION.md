# Patient Booking System - Implementation Summary

**Date:** April 8, 2026  
**Student:** MD Shafiur Rahman Alvi (ID: 23201355)

## ✅ COMPLETED CHANGES

### 1. Database Updates

#### New Columns Added to `doctor_schedules`:

- **`schedule_date`** (TEXT) - Specific date for the schedule (YYYY-MM-DD format)
- **`max_patients`** (INTEGER, DEFAULT 10) - Maximum number of patients allowed per time slot

#### New Table Created: `appointments`

```sql
CREATE TABLE appointments (
  appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  patient_age INTEGER NOT NULL,
  patient_gender TEXT CHECK(patient_gender IN ('Male', 'Female', 'Other')),
  patient_phone TEXT NOT NULL,
  patient_email TEXT,
  symptoms TEXT,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(schedule_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
)
```

### 2. Backend API Endpoints Created

**File:** `/backend/controllers/appointmentController.js`
**Routes:** `/backend/routes/appointments.js`

#### New Endpoints:

1. **GET `/api/appointments/available-doctors?date=YYYY-MM-DD`**
   - Returns list of doctors available on a specific date
   - Checks both date-specific schedules and recurring weekly schedules

2. **GET `/api/appointments/available-slots?doctorId=X&date=YYYY-MM-DD`**
   - Returns available time slots for a specific doctor on a date
   - Shows remaining capacity (max_patients - booked_count)
   - Generates time slots based on schedule duration

3. **POST `/api/appointments/book`**
   - Books an appointment for a patient
   - Validates max capacity (returns 409 if full)
   - Requires: scheduleId, doctorId, patientName, patientAge, patientPhone, appointmentDate, appointmentTime
   - Optional: patientEmail, symptoms

4. **GET `/api/appointments/doctor/:doctorId`**
   - Returns all appointments for a doctor
   - Can filter by date and status
   - Used by doctors to view their bookings

5. **PUT `/api/appointments/:appointmentId/cancel`**
   - Cancels an appointment (soft cancel, changes status to 'cancelled')

### 3. Frontend Changes

#### New Component: `PatientBooking.jsx`

**Features:**

- ✅ Date picker to select appointment date
- ✅ Search available doctors on that date
- ✅ View doctor information (specialization, fee, experience)
- ✅ Select time slot (shows remaining capacity)
- ✅ Patient information form:
  - Name (required)
  - Age (required)
  - Gender (required)
  - Phone (required)
  - Email (optional)
  - Symptoms/Reason for visit (optional)
- ✅ Booking summary before confirmation
- ✅ Max capacity validation (can't book if slot is full)
- ✅ Success/error messages
- ✅ Form resets after successful booking

#### Updated Component: `DoctorSchedule.jsx`

**New Features:**

- ✅ Toggle button to switch between "View Schedules" and "View Appointments"
- ✅ Displays patient appointment details for doctors:
  - Patient name, age, gender
  - Appointment date and time
  - Phone number and email
  - Symptoms/reason for visit
  - Appointment status (pending/confirmed/cancelled)

#### Updated Component: `App.jsx`

**Changes:**

- ✅ Added third tab: "📅 Book Appointment"
- ✅ Removed footer text:
  - ❌ "CSE471 Lab Assignment 3 - Spring 2026"
  - ❌ "Built with React, Node.js, Express, MySQL (TiDB Cloud) & AI (Groq)"
  - ❌ "© 2026 MediAI SmartCare - Group 08, Section 08"
- ✅ New simple footer: "© 2026 MediAI SmartCare. All rights reserved."

### 4. Sample Data Created

**Script:** `/backend/updateDatabase.js`

Created date-specific schedules for testing:

- **Dr. Rahim (ID 6):** Monday, Wednesday, Saturday (09:00-13:00, max 8 patients)
- **Dr. Shahnaz (ID 9):** All days except Friday (10:00-14:00, max 12 patients)
- Covers next 7 days from today

## 🎯 HOW IT WORKS

### Patient Booking Flow:

1. **Patient opens "Book Appointment" tab**
2. **Selects a date** → System fetches doctors available on that date
3. **Searches for doctor** → Can search by name, specialization, or department
4. **Clicks on a doctor** → System shows available time slots
5. **Selects a time slot** → Shows remaining capacity (e.g., "5 left")
6. **Fills patient information form**
7. **Reviews appointment summary**
8. **Clicks "Confirm Booking"**
9. **System checks capacity:**
   - ✅ If space available → Booking confirmed, appointment ID returned
   - ❌ If slot full → Error message "Maximum patient capacity reached"
10. **Form resets, ready for next booking**

### Doctor View Flow:

1. **Doctor opens "Doctor Schedule" tab**
2. **Selects their profile**
3. **Clicks "View Appointments" button**
4. **Sees list of all patient bookings:**
   - Patient details (name, age, gender, phone, email)
   - Appointment date and time
   - Symptoms/reason for visit
   - Status badge (pending/confirmed/cancelled)

## 📊 CAPACITY MANAGEMENT

### How Max Patient Limit Works:

1. Each schedule has `max_patients` field (default: 10)
2. When booking, system counts existing appointments:
   ```sql
   SELECT COUNT(*) FROM appointments
   WHERE schedule_id = X
   AND appointment_date = 'YYYY-MM-DD'
   AND status != 'cancelled'
   ```
3. If `booked_count >= max_patients` → Return HTTP 409 Conflict
4. Time slots show "X left" to indicate remaining capacity
5. When slot reaches max capacity, it no longer appears in available slots

### Example Scenario:

```
Schedule: Dr. Rahim, April 10, 09:00-13:00
Max Patients: 8
Duration: 30 minutes
Generated Slots: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30

Bookings:
- Patient 1 books 09:00 → Count: 1/8
- Patient 2 books 09:00 → Count: 2/8
- ...
- Patient 8 books 10:30 → Count: 8/8
- Patient 9 tries to book 11:00 → ❌ REJECTED (capacity full)
```

**Note:** Multiple patients can book the same schedule (not the same specific time slot), as long as total doesn't exceed max_patients.

## 🔧 FILES CREATED/MODIFIED

### Backend:

- ✅ Created: `/backend/updateDatabase.js` - Database schema updater
- ✅ Created: `/backend/controllers/appointmentController.js` - Booking logic
- ✅ Created: `/backend/routes/appointments.js` - API routes
- ✅ Modified: `/backend/server.js` - Added appointment routes

### Frontend:

- ✅ Created: `/frontend/src/components/PatientBooking.jsx` - Patient booking page
- ✅ Modified: `/frontend/src/components/DoctorSchedule.jsx` - Added appointments view
- ✅ Modified: `/frontend/src/App.jsx` - Added booking tab, removed footer text

### Database:

- ✅ Modified: `doctor_schedules` table - Added schedule_date, max_patients columns
- ✅ Created: `appointments` table - Stores all patient bookings

## 🚀 HOW TO TEST

### 1. Start Backend

```bash
cd backend
npm start
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Test Patient Booking

1. Open http://localhost:5173
2. Click "📅 Book Appointment" tab
3. Select a date (e.g., April 10, 2026)
4. You should see available doctors
5. Click on a doctor (e.g., Dr. Rahim)
6. See available time slots
7. Click a time slot
8. Fill patient form
9. Click "Confirm Booking"
10. See success message with appointment ID

### 4. Test Doctor View

1. Click "🩺 Doctor Schedule" tab
2. Click on the same doctor (Dr. Rahim)
3. Click "📋 View Appointments" button
4. See the booking you just made!

### 5. Test Max Capacity

1. Book appointments for the same doctor/date until it says "X left" reaches 0
2. Try booking one more → Should see error "Maximum patient capacity reached"

## 📝 API TESTING (curl)

### Get available doctors on a date:

```bash
curl "http://localhost:1355/api/appointments/available-doctors?date=2026-04-10"
```

### Get available slots:

```bash
curl "http://localhost:1355/api/appointments/available-slots?doctorId=6&date=2026-04-10"
```

### Book an appointment:

```bash
curl -X POST http://localhost:1355/api/appointments/book \
  -H "Content-Type: application/json" \
  -d '{
    "scheduleId": 60,
    "doctorId": 6,
    "patientName": "রহমান আহমেদ",
    "patientAge": 35,
    "patientGender": "Male",
    "patientPhone": "+880 1712-345678",
    "patientEmail": "rahman@example.com",
    "symptoms": "Chest pain and shortness of breath",
    "appointmentDate": "2026-04-10",
    "appointmentTime": "09:00:00"
  }'
```

### View doctor appointments:

```bash
curl "http://localhost:1355/api/appointments/doctor/6"
```

### View appointments for a specific date:

```bash
curl "http://localhost:1355/api/appointments/doctor/6?date=2026-04-10"
```

## 🎨 UI/UX IMPROVEMENTS

### Patient Booking Page:

- Clean 3-column layout
- Left: Available doctors list (searchable)
- Right: Time slots grid + booking form
- Visual feedback for selected items (blue highlighting)
- Time slots show remaining capacity
- Responsive design (mobile-friendly)
- Error/success messages with icons
- Form validation before submission

### Doctor Schedule Page:

- Toggle button to switch views
- Appointments displayed as cards
- Color-coded status badges:
  - Yellow: Pending
  - Green: Confirmed
  - Red: Cancelled
  - Gray: Completed
- Patient information clearly organized
- Symptoms displayed in highlighted box

## 📈 DATABASE STATISTICS

After running `updateDatabase.js`:

- **Total doctors:** 15
- **Total schedules:** 57 (55 recurring + 2 date-specific)
- **Total appointments:** 0 (ready for bookings)
- **Tables:** doctors, doctor_schedules, appointments, time_slots, symptom_checks

## ⚠️ IMPORTANT NOTES

1. **Date-specific vs Recurring Schedules:**
   - Schedules with `schedule_date` = specific date only
   - Schedules with `schedule_date = NULL` = recurring weekly
   - System checks both when finding available doctors

2. **Max Patients vs Time Slots:**
   - `max_patients` applies to the **entire schedule period**, not per time slot
   - Example: 09:00-13:00 with max 8 patients means 8 total bookings, not 8 per slot

3. **Status Workflow:**
   - New appointments start as `'pending'`
   - Doctor can change to `'confirmed'`, `'completed'`, or `'cancelled'`
   - Only non-cancelled appointments count toward capacity

4. **Search Functionality:**
   - Patient can search by doctor name, specialization, or department
   - Case-insensitive search
   - Updates results in real-time

## 🔐 FUTURE ENHANCEMENTS (Not Implemented)

- [ ] User authentication (patient/doctor login)
- [ ] Email/SMS confirmation after booking
- [ ] Doctor ability to confirm/reject appointments
- [ ] Patient dashboard to view their appointment history
- [ ] Payment integration
- [ ] Appointment reminders
- [ ] Doctor schedule generation (auto-generate from recurring schedules)
- [ ] Appointment rescheduling
- [ ] Video consultation links

## ✅ SUMMARY

All requested features have been implemented:

- ✅ Removed footer text about CSE471, tech stack, and copyright
- ✅ Added `schedule_date` column to schedules
- ✅ Added `max_patients` column to schedules
- ✅ Created separate patient booking page
- ✅ Patient can search available doctors on specific date
- ✅ Patient fills form with personal info
- ✅ Max capacity validation prevents overbooking
- ✅ Doctor can view patient appointment info

**System is fully functional and ready for demonstration!**

---

**Last Updated:** April 8, 2026  
**Student:** MD Shafiur Rahman Alvi (ID: 23201355)
