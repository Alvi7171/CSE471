# Patient Management & Medical Timeline Implementation
## MediAI SmartCare - Feature Documentation

**Author:** MD Shafiur Rahman Alvi  
**Student ID:** 23201355  
**Date:** April 2026  

---

## 📋 Overview

The Patient Management & Medical Timeline system provides comprehensive digital health records management with the following capabilities:

1. **Digital Patient Registration** - Unique Smart Patient ID generation
2. **Complete Medical History** - Centralized patient health records
3. **Visit Records** - Comprehensive visit documentation
4. **Diagnostic Reports** - Lab results and test management
5. **Prescriptions** - Medication tracking and management
6. **Treatment Timeline** - Treatment history visualization
7. **Access Control** - Doctor authorization and audit trails

---

## 🗄️ Database Schema

### Core Tables

#### 1. **Patients Table**
```sql
- smart_patient_id (UNIQUE, Format: SPC-XXXXX)
- Basic demographics (name, DOB, gender, blood type)
- Contact information (phone, email, address)
- Emergency contact details
- Medical history flags (allergies, chronic diseases, current medications)
```

#### 2. **Medical Visits Table**
```sql
- patient_id (FK)
- doctor_id (FK)
- appointment_id (FK)
- Visit details (date, reason, chief complaint)
- Clinical data (vital signs JSON, diagnosis, notes)
- Status tracking (scheduled, completed, cancelled, no-show)
- Follow-up management
```

#### 3. **Diagnostic Reports Table**
```sql
- patient_id (FK)
- doctor_id (FK)
- visit_id (FK)
- Report metadata (type, test name, lab name, date)
- Results (stored as JSON)
- Abnormalities and interpretation
- Urgency level (Normal, Abnormal, Critical)
```

#### 4. **Prescriptions Table**
```sql
- patient_id (FK)
- doctor_id (FK)
- visit_id (FK)
- Medication details (name, dosage, frequency, duration)
- Route of administration
- Special instructions
- Refill tracking (allowed vs. used)
- Expiry date management
```

#### 5. **Treatment Timeline Table**
```sql
- patient_id (FK)
- doctor_id (FK)
- Treatment details (type, name, description)
- Duration and status (scheduled/ongoing/completed/cancelled/paused)
- Outcome documentation
- Progress notes
```

#### 6. **Doctor-Patient Access Control Table**
```sql
- doctor_id (FK)
- patient_id (FK)
- Access level (view, edit, full, limited)
- Access reason (Primary Physician, Specialist, etc.)
- Audit trail (granted date, revoked date)
- Active status
```

#### 7. **Medical History Audit Log Table**
```sql
- Tracks all access to patient records
- Records action type (viewed, created, modified, deleted)
- Records access timestamp and IP
- Maintains compliance and security logs
```

---

## 🔌 API Endpoints

### Patient Registration Endpoints

```
POST   /api/patients/register
       - Register new patient, generates Smart Patient ID

GET    /api/patients/:patientId
       - Retrieve patient info (by Smart ID or Patient ID)

PUT    /api/patients/:patientId
       - Update patient information
```

### Medical Visits Endpoints

```
POST   /api/patients/:patientId/visits
       - Record new medical visit

GET    /api/patients/:patientId/visits
       - Retrieve all visits for patient
```

### Diagnostic Reports Endpoints

```
POST   /api/patients/:patientId/reports
       - Add diagnostic report

GET    /api/patients/:patientId/reports
       - Retrieve all diagnostic reports
```

### Prescriptions Endpoints

```
POST   /api/patients/:patientId/prescriptions
       - Issue new prescription

GET    /api/patients/:patientId/prescriptions?activeOnly=true
       - Retrieve prescriptions (filter by active status)
```

### Treatment Timeline Endpoints

```
POST   /api/patients/:patientId/timeline
       - Add treatment timeline entry

GET    /api/patients/:patientId/timeline
       - Retrieve complete treatment timeline
```

### Access Control Endpoints

```
POST   /api/patients/:patientId/access/grant
       - Grant doctor access to patient records

GET    /api/patients/:patientId/access
       - View doctors with access

DELETE /api/patients/:patientId/access/:doctorId
       - Revoke doctor access
```

### Complete Medical History Endpoint

```
GET    /api/patients/:patientId/complete-history
       - Retrieve complete medical record (all data types)
       - Returns: patient info, visits, reports, prescriptions, timeline

POST   /api/patients/:patientId/audit-log
       - Log access for audit trail
```

---

## 🎨 Frontend Components

### 1. PatientRegistration Component
**File:** `frontend/src/components/PatientRegistration.jsx`

**Features:**
- Multi-section registration form
- Personal information collection
- Address information
- Emergency contact details
- Medical information (allergies, chronic diseases, medications)
- Real-time Smart Patient ID generation and display
- Patient ID card preview with download functionality

**User Flow:**
1. Fill out registration form
2. Submit to generate Smart Patient ID
3. View digital patient card
4. Download patient ID card for offline records

### 2. MedicalTimeline Component
**File:** `frontend/src/components/MedicalTimeline.jsx`

**Features:**
- Search by Smart Patient ID or Patient ID
- Tabbed interface showing:
  - **Medical Visits** - All patient consultations with details
  - **Diagnostic Reports** - Lab results with abnormality flags
  - **Prescriptions** - Active/inactive medication records
  - **Treatment Timeline** - Visual timeline of all treatments
- Color-coded status badges
- Patient information header
- Record counts per category

**User Flow:**
1. Enter patient ID in search
2. View complete medical history
3. Switch between different record types
4. Access detailed information for each record

---

## 💾 Smart Patient ID Generation

**Format:** `SPC-XXXXXXXX`
- **SPC**: Smart Patient Care identifier
- **XXXXXXXX**: 8-character alphanumeric random string

**Example:** `SPC-7F3A8E2B`

**Characteristics:**
- Automatically generated at registration
- Unique and immutable
- Machine-readable format
- QR code compatible

---

## 🔐 Access Control & Security

### Access Levels
1. **View** - Read-only access to patient records
2. **Edit** - Can view and modify records (except sensitive data)
3. **Full** - Complete access including deletion rights
4. **Limited** - Restricted access to specific record types

### Audit Trail
Every access to patient records is logged with:
- Accessing doctor ID
- Action type (viewed, created, modified, deleted)
- Record type accessed
- Timestamp
- IP address (recommended)

### Security Best Practices
- All endpoints should require authentication (implement in production)
- Use HTTPS for all API communication
- Implement role-based access control (RBAC)
- Encrypt sensitive medical data
- Regular audit log reviews
- Comply with HIPAA/GDPR regulations

---

## 📊 Data Models

### Vital Signs JSON Format
```json
{
  "bp": "120/80",           // Blood Pressure
  "hr": 72,                 // Heart Rate (bpm)
  "temp": 98.6,             // Temperature (F)
  "respiratory_rate": 16,   // Breaths per minute
  "spo2": 98,               // Oxygen Saturation (%)
  "weight": 70,             // Weight (kg)
  "height": 175             // Height (cm)
}
```

### Diagnostic Results JSON Format
```json
{
  "test_name": "Complete Blood Count",
  "parameters": [
    {
      "name": "Hemoglobin",
      "value": 14.5,
      "unit": "g/dL",
      "reference_range": "13.5-17.5",
      "status": "Normal"
    },
    {
      "name": "WBC",
      "value": 7.2,
      "unit": "K/uL",
      "reference_range": "4.5-11.0",
      "status": "Normal"
    }
  ]
}
```

---

## 🚀 Usage Examples

### Register a Patient
```bash
POST http://localhost:1355/api/patients/register
Content-Type: application/json

{
  "firstName": "Ayesha",
  "lastName": "Khan",
  "dateOfBirth": "1990-05-15",
  "gender": "Female",
  "bloodType": "AB+",
  "phoneNumber": "+8801712345678",
  "email": "ayesha.khan@email.com",
  "address": "House 42, Road 15, Mirpur",
  "city": "Dhaka",
  "country": "Bangladesh",
  "emergencyContactName": "Karim Khan",
  "emergencyContactPhone": "+8801812345679",
  "allergies": "Penicillin, Latex",
  "chronicDiseases": "Type 2 Diabetes",
  "currentMedications": "Metformin 500mg"
}
```

### Record a Medical Visit
```bash
POST http://localhost:1355/api/patients/SPC-7F3A8E2B/visits
Content-Type: application/json

{
  "doctorId": 1,
  "appointmentId": 5,
  "visitDate": "2026-04-13",
  "visitReason": "Routine Checkup",
  "chiefComplaint": "Regular consultation",
  "vitalSigns": {
    "bp": "118/76",
    "hr": 70,
    "temp": 98.4,
    "respiratory_rate": 16,
    "spo2": 99
  },
  "diagnosis": "Healthy, continue current medication",
  "clinicalNotes": "Patient doing well, blood sugar controlled",
  "status": "completed",
  "followUpRequired": false
}
```

### Add Diagnostic Report
```bash
POST http://localhost:1355/api/patients/SPC-7F3A8E2B/reports
Content-Type: application/json

{
  "doctorId": 1,
  "visitId": 1,
  "reportType": "Blood Test",
  "testName": "Fasting Glucose",
  "reportDate": "2026-04-13",
  "labName": "LabCorp Diagnostics",
  "results": {
    "glucose": {
      "value": 115,
      "unit": "mg/dL",
      "reference": "70-100"
    }
  },
  "interpretation": "Slightly elevated, monitor diet and exercise"
}
```

### Issue Prescription
```bash
POST http://localhost:1355/api/patients/SPC-7F3A8E2B/prescriptions
Content-Type: application/json

{
  "doctorId": 1,
  "visitId": 1,
  "prescriptionDate": "2026-04-13",
  "medicationName": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "duration": "30 days",
  "route": "Oral",
  "instructions": "Take with or without food, at the same time each day",
  "refillsAllowed": 3
}
```

### Grant Doctor Access
```bash
POST http://localhost:1355/api/patients/SPC-7F3A8E2B/access/grant
Content-Type: application/json

{
  "doctorId": 2,
  "accessLevel": "view",
  "accessReason": "Specialist consultation"
}
```

### Get Complete Medical History
```bash
GET http://localhost:1355/api/patients/SPC-7F3A8E2B/complete-history

Response:
{
  "success": true,
  "medicalHistory": {
    "patient": { /* patient details */ },
    "visits": [ /* array of visits */ ],
    "diagnosticReports": [ /* array of reports */ ],
    "prescriptions": [ /* array of prescriptions */ ],
    "treatmentTimeline": [ /* array of timeline entries */ ]
  }
}
```

---

## 🔄 Integration with Existing Features

### Appointment to Medical Visit
When a patient appointment is completed:
1. System creates a medical visit record
2. Links visit to original appointment
3. Doctor can add visit details immediately

### Symptom Checker to Diagnosis
When AI identifies potential conditions:
1. Symptom check details can be imported to visit
2. Helps doctors with initial assessment
3. Maintains AI-assisted diagnostic history

### Doctor Schedule to Availability
All doctor's scheduled appointments automatically:
1. Populate as available visits
2. Can be marked as done/cancelled
3. Trigger visit record creation

---

## 📈 Analytics & Reporting (Future Enhancement)

Potential data that can be extracted:
- Patient visit frequency
- Most common diagnoses
- Prescription compliance rates
- Treatment success metrics
- Doctor utilization patterns
- Emergency visit statistics
- Follow-up appointment completion rates

---

## 🛠️ Technology Stack

**Backend:**
- Node.js with Express.js
- SQLite database
- Better-sqlite3 for database operations
- CORS enabled for frontend

**Frontend:**
- React.js
- Tailwind CSS for styling
- Axios for HTTP requests
- Real-time UI updates

**Features:**
- RESTful API architecture
- JSON data format for complex medical data
- Responsive design
- Mobile-friendly interface

---

## 📝 Implementation Checklist

- ✅ Database schema creation
- ✅ Patient controller implementation
- ✅ API routes setup
- ✅ Frontend registration component
- ✅ Frontend timeline component
- ✅ Navigation integration
- ⬜ Authentication & authorization (TODO)
- ⬜ Data encryption (TODO)
- ⬜ File upload for reports (TODO)
- ⬜ Advanced search & filtering (TODO)
- ⬜ Export to PDF functionality (TODO)
- ⬜ Mobile app version (TODO)
- ⬜ Real-time notifications (TODO)
- ⬜ Compliance audit reports (TODO)

---

## 🔗 File Locations

```
mediai-smartcare/
├── backend/
│   ├── controllers/
│   │   └── patientController.js (NEW)
│   ├── routes/
│   │   └── patients.js (NEW)
│   ├── models/
│   │   └── patientSchema.sql (NEW)
│   └── server.js (UPDATED)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── PatientRegistration.jsx (NEW)
│       │   └── MedicalTimeline.jsx (NEW)
│       └── App.jsx (UPDATED)
└── PATIENT_MANAGEMENT_DOCUMENTATION.md (NEW)
```

---

## 🎯 Next Steps

1. **Testing:**
   - Unit tests for controller functions
   - Integration tests for API endpoints
   - Frontend component testing

2. **Security:**
   - Implement JWT authentication
   - Add authorization middleware
   - Encrypt sensitive data

3. **Enhancements:**
   - File upload for medical reports
   - PDF export functionality
   - Advanced search filters
   - Real-time notifications
   - Mobile app support

4. **Compliance:**
   - HIPAA compliance review
   - GDPR data privacy implementation
   - Audit logging expansion
   - Data retention policies

---

## 📞 Support & Questions

For implementation questions or issues, please refer to:
- Backend API documentation in [DATABASE_AND_API_DOCUMENTATION.md](../DATABASE_AND_API_DOCUMENTATION.md)
- Database structure in [DATABASE_STRUCTURE.txt](../DATABASE_STRUCTURE.txt)
- Quick reference in [QUICK_REFERENCE.md](../QUICK_REFERENCE.md)

---

**End of Documentation**
