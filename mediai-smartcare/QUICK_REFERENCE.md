# Quick Reference Guide - Doctor Scheduling Feature

**Student:** MD Shafiur Rahman Alvi (ID: 23201355)

## ✅ DATABASE STATUS

- **Type:** SQLite
- **Location:** `/backend/mediai_smartcare.db`
- **Status:** ✅ Working & Connected
- **Total Doctors:** 15 (10 Bengali + 5 English names)
- **Total Schedules:** 55 schedule slots

## 📊 TABLES

1. **doctors** - Doctor information
2. **doctor_schedules** - Weekly availability schedules
3. **time_slots** - Individual appointment slots (ready for future use)
4. **symptom_checks** - AI symptom analysis records

## 🔌 API ENDPOINTS (Port 1355)

### Get All Doctors

```bash
GET http://localhost:1355/api/schedule/doctors
```

### Search Doctors

```bash
GET http://localhost:1355/api/schedule/doctors/search?specialization=Cardiologist
```

### Get Doctor Schedule

```bash
GET http://localhost:1355/api/schedule/doctors/6
```

### Create Schedule

```bash
POST http://localhost:1355/api/schedule/create
Body: {
  "doctorId": 6,
  "dayOfWeek": "Tuesday",
  "startTime": "10:00:00",
  "endTime": "14:00:00",
  "slotDuration": 30
}
```

### Update Schedule

```bash
PUT http://localhost:1355/api/schedule/56
Body: { "startTime": "11:00:00", ... }
```

### Delete Schedule

```bash
DELETE http://localhost:1355/api/schedule/56
```

## 🇧🇩 BENGALI DOCTORS ADDED

1. **ডাঃ রহিম উদ্দিন চৌধুরী** (ID: 6) - Cardiologist - ৳1500
2. **ডাঃ নাসরীন সুলতানা** (ID: 7) - Gynecologist - ৳1200
3. **ডাঃ কামরুল ইসলাম** (ID: 8) - Orthopedic - ৳1300
4. **ডাঃ শাহনাজ পারভীন** (ID: 9) - Pediatrician - ৳900
5. **ডাঃ তারেক আজিজ খান** (ID: 10) - Neurologist - ৳1600
6. **ডাঃ ফাতেমা বেগম** (ID: 11) - Dermatologist - ৳1000
7. **ডাঃ হাসান মাহমুদ** (ID: 12) - General Physician - ৳600
8. **ডাঃ রুমানা আক্তার** (ID: 13) - Psychiatrist - ৳1100
9. **ডাঃ শফিক হোসেন** (ID: 14) - ENT Specialist - ৳1000
10. **ডাঃ সাবিনা ইয়াসমিন** (ID: 15) - Ophthalmologist - ৳1200

## 🔄 ACTION → API → DATABASE FLOW

| User Action             | API Call                                                     | Database Query                                                    | Table            |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------- |
| Opens doctor list       | GET /api/schedule/doctors                                    | SELECT \* FROM doctors WHERE is_available=1                       | doctors          |
| Searches "Cardiologist" | GET /api/schedule/doctors/search?specialization=Cardiologist | SELECT \* FROM doctors WHERE specialization LIKE '%Cardiologist%' | doctors          |
| Clicks doctor card      | GET /api/schedule/doctors/6                                  | SELECT \* FROM doctor_schedules WHERE doctor_id=6                 | doctor_schedules |
| Adds new schedule       | POST /api/schedule/create                                    | INSERT INTO doctor_schedules VALUES(...)                          | doctor_schedules |
| Updates schedule        | PUT /api/schedule/56                                         | UPDATE doctor_schedules SET ... WHERE schedule_id=56              | doctor_schedules |
| Deletes schedule        | DELETE /api/schedule/56                                      | UPDATE doctor_schedules SET is_active=0 WHERE schedule_id=56      | doctor_schedules |

## 🛡️ CONFLICT PREVENTION

**How it works:**

1. Before creating a schedule, system checks for time overlaps
2. SQL query finds any existing schedule that conflicts
3. If conflict found → Return HTTP 409 error
4. If no conflict → Insert new schedule

**Example:**

- Existing: Monday 09:00-13:00
- Try to add: Monday 10:00-12:00 ❌ CONFLICT
- Try to add: Monday 14:00-18:00 ✅ ALLOWED

## 📱 CURRENT PAGE

**Single Page:** `DoctorSchedule.jsx`

- Shows all doctors (left panel)
- Shows selected doctor's schedule (right panel)
- Search functionality
- Create/Update/Delete schedule buttons

## 📱 RECOMMENDED: TWO SEPARATE PAGES

### Page 1: Patient View

- Search doctors by specialization
- View doctor profiles
- View weekly schedules
- **NEW:** Book appointment form
- **NEW:** Select date and time slot
- **NEW:** Enter patient info

### Page 2: Doctor/Moderator View

- Create new schedule slots
- Update existing schedules
- Delete schedules
- **NEW:** View appointment requests
- **NEW:** Approve/reject bookings
- **NEW:** View appointment history

## 🚀 HOW TO TEST

1. **Start Backend:**

   ```bash
   cd backend
   npm start
   ```

   Server runs on http://localhost:1355

2. **Start Frontend:**

   ```bash
   cd frontend
   npm run dev
   ```

   App runs on http://localhost:5173

3. **Test API:**

   ```bash
   curl http://localhost:1355/api/schedule/doctors
   ```

4. **View Bengali Doctors:**
   Open browser → http://localhost:5173 → Click "Doctor Schedule" tab

## 📂 KEY FILES

- **Database:** `/backend/mediai_smartcare.db`
- **DB Config:** `/backend/config/database.js`
- **API Routes:** `/backend/routes/doctorSchedule.js`
- **Controller:** `/backend/controllers/scheduleController.js`
- **Frontend:** `/frontend/src/components/DoctorSchedule.jsx`
- **API Service:** `/frontend/src/services/api.js`

## 🎯 FOR YOUR PROFESSOR

**Questions to answer:**

1. ✅ Database working? → Yes, SQLite with 15 doctors and 55 schedules
2. ✅ Is it SQLite? → Yes, using better-sqlite3
3. ✅ Which action calls which API? → See flow table above
4. ✅ How does database work? → Node.js → Express → Controller → SQL → SQLite file
5. ✅ Bengali data? → 10 Bengali doctors with 37 schedules added
6. ✅ Conflict prevention? → SQL overlap detection query (see documentation)

**Demo Script:**

1. Show backend running on port 1355
2. Show frontend on port 5173
3. Click "Doctor Schedule" tab
4. Show Bengali doctor names in the list
5. Click on a Bengali doctor (e.g., Dr. Rahim)
6. Show their weekly schedule (Monday 09:00-13:00, etc.)
7. Try to add conflicting schedule → Show error
8. Add non-conflicting schedule → Show success

## 📖 FULL DOCUMENTATION

See `DATABASE_AND_API_DOCUMENTATION.md` for complete details:

- Database schema with all columns
- API endpoint specifications
- SQL queries explained
- Conflict prevention logic
- Data flow diagrams
- Frontend architecture
- Code examples

---

**Last Updated:** April 7, 2026
