# Patient Management API - Quick Reference Guide

## 🚀 Quick Start

**Base URL:** `http://localhost:1355/api/patients`

---

## 📝 Patient Registration

### Register New Patient
```bash
POST /register

REQUEST BODY:
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "dateOfBirth": "YYYY-MM-DD (required)",
  "gender": "Male|Female|Other (required)",
  "bloodType": "O+|O-|A+|A-|B+|B-|AB+|AB-",
  "phoneNumber": "string (required, unique)",
  "email": "string (optional, unique)",
  "address": "string",
  "city": "string",
  "stateProvince": "string",
  "postalCode": "string",
  "country": "string",
  "emergencyContactName": "string",
  "emergencyContactPhone": "string",
  "nationalId": "string (unique)",
  "allergies": "comma-separated list",
  "chronicDiseases": "comma-separated list",
  "currentMedications": "comma-separated list"
}

RESPONSE:
{
  "success": true,
  "message": "Patient registered successfully",
  "patient": {
    "patientId": 1,
    "smartPatientId": "SPC-7F3A8E2B",
    "firstName": "Ayesha",
    "lastName": "Khan",
    "phoneNumber": "+8801712345678",
    "email": "ayesha.khan@email.com"
  }
}
```

### Get Patient Info
```bash
GET /:patientId

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

RESPONSE:
{
  "success": true,
  "patient": {
    "patient_id": 1,
    "smart_patient_id": "SPC-7F3A8E2B",
    "first_name": "Ayesha",
    "last_name": "Khan",
    "date_of_birth": "1990-05-15",
    "gender": "Female",
    "blood_type": "AB+",
    "phone_number": "+8801712345678",
    "email": "ayesha.khan@email.com",
    "address": "House 42, Road 15, Mirpur",
    "city": "Dhaka",
    "country": "Bangladesh",
    "emergency_contact_name": "Karim Khan",
    "emergency_contact_phone": "+8801812345679",
    "allergies": "Penicillin, Latex",
    "chronic_diseases": "Type 2 Diabetes",
    "current_medications": "Metformin 500mg",
    "registration_date": "2026-04-13T10:30:00.000Z"
  }
}
```

### Update Patient Info
```bash
PUT /:patientId

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

REQUEST BODY:
{
  "email": "newemail@example.com",
  "phoneNumber": "+8801812345679",
  "address": "New Address",
  "currentMedications": "Metformin 500mg, Lisinopril 10mg",
  "allergies": "Penicillin, Latex, Iodine"
  // Only include fields you want to update
}

RESPONSE:
{
  "success": true,
  "message": "Patient updated successfully"
}
```

---

## 🏥 Medical Visits

### Record Medical Visit
```bash
POST /:patientId/visits

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

REQUEST BODY:
{
  "doctorId": 1 (required),
  "appointmentId": 5 (optional),
  "visitDate": "2026-04-13" (required),
  "visitReason": "Routine Checkup" (required),
  "chiefComplaint": "Patient reports no concerns",
  "vitalSigns": {
    "bp": "120/80",
    "hr": 72,
    "temp": 98.6,
    "respiratory_rate": 16,
    "spo2": 98,
    "weight": 70,
    "height": 175
  },
  "diagnosis": "Patient is healthy",
  "clinicalNotes": "All vital signs normal, continue current regimen",
  "status": "completed|scheduled|cancelled|no-show",
  "followUpRequired": true,
  "followUpDate": "2026-05-13"
}

RESPONSE:
{
  "success": true,
  "message": "Medical visit recorded",
  "visitId": 1
}
```

### Get Patient Visits
```bash
GET /:patientId/visits

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

RESPONSE:
{
  "success": true,
  "visits": [
    {
      "visit_id": 1,
      "patient_id": 1,
      "doctor_id": 1,
      "doctor_name": "Dr. Sarah Ahmed",
      "specialization": "Cardiologist",
      "visit_date": "2026-04-13",
      "visit_reason": "Routine Checkup",
      "chief_complaint": "No concerns",
      "vital_signs": "{...JSON...}",
      "diagnosis": "Patient is healthy",
      "clinical_notes": "...",
      "status": "completed",
      "follow_up_required": 1,
      "follow_up_date": "2026-05-13",
      "created_at": "2026-04-13T10:30:00.000Z"
    }
  ]
}

Total Count: visits.length
```

---

## 🔬 Diagnostic Reports

### Add Diagnostic Report
```bash
POST /:patientId/reports

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

REQUEST BODY:
{
  "doctorId": 1 (required),
  "visitId": 1 (optional),
  "reportType": "Blood Test|X-Ray|ECG|Ultrasound|MRI|CT Scan",
  "testName": "Complete Blood Count" (required),
  "reportDate": "2026-04-13" (required),
  "labName": "LabCorp Diagnostics",
  "results": {
    "hemoglobin": {
      "value": 14.5,
      "unit": "g/dL",
      "reference": "13.5-17.5"
    },
    "wbc": {
      "value": 7.2,
      "unit": "K/uL",
      "reference": "4.5-11.0"
    }
  },
  "referenceValues": "Normal ranges provided by lab",
  "abnormalities": "None detected",
  "urgencyLevel": "Normal|Abnormal|Critical",
  "interpretation": "All values within normal limits"
}

RESPONSE:
{
  "success": true,
  "message": "Diagnostic report added",
  "reportId": 1
}
```

### Get Patient Reports
```bash
GET /:patientId/reports

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

RESPONSE:
{
  "success": true,
  "reports": [
    {
      "report_id": 1,
      "patient_id": 1,
      "doctor_id": 1,
      "doctor_name": "Dr. Sarah Ahmed",
      "visit_id": 1,
      "report_type": "Blood Test",
      "test_name": "Complete Blood Count",
      "report_date": "2026-04-13",
      "lab_name": "LabCorp Diagnostics",
      "results": "{...JSON...}",
      "reference_values": "...",
      "abnormalities": "None",
      "urgency_level": "Normal",
      "interpretation": "...",
      "created_at": "2026-04-13T10:30:00.000Z"
    }
  ]
}
```

---

## 💊 Prescriptions

### Issue Prescription
```bash
POST /:patientId/prescriptions

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

REQUEST BODY:
{
  "doctorId": 1 (required),
  "visitId": 1 (optional),
  "prescriptionDate": "2026-04-13" (required),
  "medicationName": "Lisinopril" (required),
  "dosage": "10mg" (required),
  "frequency": "Once daily|Twice daily|Every 8 hours" (required),
  "duration": "30 days|7 days" (required),
  "route": "Oral|Injection|Topical|Inhalation|Rectal" (required),
  "instructions": "Take with or without food, at the same time each day",
  "refillsAllowed": 3,
  "expiryDate": "2026-07-13",
  "pharmacyName": "City Pharmacy"
}

RESPONSE:
{
  "success": true,
  "message": "Prescription added",
  "prescriptionId": 1
}
```

### Get Patient Prescriptions
```bash
GET /:patientId/prescriptions
GET /:patientId/prescriptions?activeOnly=true

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

QUERY:
activeOnly = true (optional, default: false)

RESPONSE:
{
  "success": true,
  "prescriptions": [
    {
      "prescription_id": 1,
      "patient_id": 1,
      "doctor_id": 1,
      "doctor_name": "Dr. Sarah Ahmed",
      "visit_id": 1,
      "prescription_date": "2026-04-13",
      "medication_name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "route": "Oral",
      "instructions": "...",
      "refills_allowed": 3,
      "refills_used": 0,
      "is_active": 1,
      "expiry_date": "2026-07-13",
      "pharmacy_name": "City Pharmacy",
      "created_at": "2026-04-13T10:30:00.000Z"
    }
  ]
}
```

---

## 📊 Treatment Timeline

### Add Treatment Timeline Entry
```bash
POST /:patientId/timeline

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

REQUEST BODY:
{
  "doctorId": 1,
  "treatmentDate": "2026-04-13" (required),
  "treatmentType": "Medication|Procedure|Therapy|Surgery" (required),
  "treatmentName": "Physical Therapy" (required),
  "treatmentDescription": "20 sessions of PT for knee recovery",
  "duration": "6 weeks",
  "status": "scheduled|ongoing|completed|cancelled|paused",
  "outcome": "Patient recovery progressing well",
  "notes": "Continue daily exercises at home"
}

RESPONSE:
{
  "success": true,
  "message": "Treatment timeline entry added",
  "timelineId": 1
}
```

### Get Patient Treatment Timeline
```bash
GET /:patientId/timeline

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

RESPONSE:
{
  "success": true,
  "timeline": [
    {
      "timeline_id": 1,
      "patient_id": 1,
      "doctor_id": 1,
      "doctor_name": "Dr. Sarah Ahmed",
      "treatment_date": "2026-04-13",
      "treatment_type": "Physical Therapy",
      "treatment_name": "Knee Recovery Program",
      "treatment_description": "20 sessions of PT",
      "duration": "6 weeks",
      "status": "ongoing",
      "outcome": "Progressing well",
      "notes": "Continue exercises",
      "created_at": "2026-04-13T10:30:00.000Z",
      "updated_at": "2026-04-13T10:30:00.000Z"
    }
  ]
}
```

---

## 🔐 Access Control

### Grant Doctor Access
```bash
POST /:patientId/access/grant

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

REQUEST BODY:
{
  "doctorId": 2 (required),
  "accessLevel": "view|edit|full|limited" (optional, default: "view"),
  "accessReason": "Specialist consultation"
}

RESPONSE:
{
  "success": true,
  "message": "Doctor access granted"
}
```

### Get Access List
```bash
GET /:patientId/access

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

RESPONSE:
{
  "success": true,
  "accessList": [
    {
      "access_id": 1,
      "doctor_id": 2,
      "doctor_name": "Dr. Kamal Hassan",
      "specialization": "Neurologist",
      "email": "kamal.hassan@mediai.com",
      "access_level": "view",
      "access_reason": "Specialist consultation",
      "is_active": 1,
      "granted_date": "2026-04-13T10:30:00.000Z",
      "revoked_date": null
    }
  ]
}
```

### Revoke Doctor Access
```bash
DELETE /:patientId/access/:doctorId

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"
doctorId = "2"

RESPONSE:
{
  "success": true,
  "message": "Doctor access revoked"
}
```

---

## 📋 Complete Medical History

### Get All Medical Records
```bash
GET /:patientId/complete-history

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

RESPONSE:
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

## 🔍 Audit Logging

### Log Access Event
```bash
POST /:patientId/audit-log

PARAMS:
patientId = "SPC-7F3A8E2B" OR "1"

REQUEST BODY:
{
  "doctorId": 1,
  "actionType": "viewed|created|modified|deleted" (required),
  "recordType": "visit|report|prescription|treatment" (required),
  "recordId": 1 (optional)
}

RESPONSE:
{
  "success": true,
  "message": "Access logged"
}
```

---

## ⚠️ Error Responses

### Common Error Responses

```json
{
  "success": false,
  "message": "Patient not found"
}
// Status: 404

{
  "success": false,
  "message": "Missing required fields: firstName, lastName, dateOfBirth, gender, phoneNumber"
}
// Status: 400

{
  "success": false,
  "message": "Error registering patient",
  "error": "Phone number already exists"
}
// Status: 500
```

---

## 🎯 Common Workflows

### Workflow 1: New Patient Registration & First Visit
1. `POST /register` - Register patient
2. `POST /{patientId}/visits` - Record first visit
3. `POST /{patientId}/reports` - Add lab results (if any)
4. `POST /{patientId}/prescriptions` - Issue prescriptions
5. `GET /{patientId}/complete-history` - View full record

### Workflow 2: Doctor Views Patient History
1. Search for patient by Smart ID
2. `GET /{patientId}/complete-history` - Get ALL records
3. Review visits, reports, prescriptions, timeline
4. System automatically logs access in audit trail

### Workflow 3: Grant Access to Specialist
1. `POST /{patientId}/access/grant` - Grant specialist access
2. Specialist can `GET /{patientId}/complete-history`
3. Specialist adds findings: `POST /{patientId}/reports`
4. `POST /{patientId}/access/{doctorId}` - Later revoke if needed

### Workflow 4: Track Treatment Progress
1. `POST /{patientId}/timeline` - Start treatment
2. `POST /{patientId}/visits` - Record follow-ups
3. `POST /{patientId}/reports` - Track test results
4. `GET /{patientId}/timeline` - View progress over time

---

## 📞 Testing with Postman

**Import Collection:** MediAI_SmartCare_Postman_Collection.json

**Environment Variables:**
```
BASE_URL = http://localhost:1355/api/patients
PATIENT_ID = SPC-7F3A8E2B
DOCTOR_ID = 1
```

---

## 💡 Tips & Best Practices

1. **Always use Smart Patient ID** when possible (format: SPC-XXXXX)
2. **Store vital signs as JSON** for flexibility and querying
3. **Log all access** for audit and compliance
4. **Use activeOnly=true** when retrieving prescriptions to show current meds
5. **Include followUpDate** if followUpRequired is true
6. **Set urgencyLevel** for diagnostic reports (Normal/Abnormal/Critical)
7. **Add contextual reasons** when granting doctor access
8. **Test error handling** for missing required fields

---

End of Quick Reference
