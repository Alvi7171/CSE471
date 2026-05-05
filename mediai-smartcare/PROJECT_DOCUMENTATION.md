# MediAI SmartCare - Project Documentation

## 1. Scope and System Direction

MediAI SmartCare is a hospital workflow platform built with:

- Frontend: React (Vite)
- Backend: Express (Node.js)
- Database: SQLite fallback with MySQL compatibility

Current implementation direction:

- Billing is removed completely.
- The system is prescription-focused.
- Email notifications are Brevo-only.

## 2. Functional Modules

### 2.1 Appointment Booking (Patient Side)

Patient booking flow:

1. Select appointment date.
2. Load available doctors for that date.
3. Select a doctor.
4. Load available slots for that doctor/date.
5. Enter one free-text clinical description.
6. Submit booking request.

Data handling and validation:

- The backend validates date/time format.
- The backend checks schedule ownership and schedule window bounds.
- The backend prevents slot conflicts for active appointment statuses.
- New appointments are stored with `pending` status.

Booking text model:

Patients enter one free-text description during booking, and the system stores it in the symptoms field; there is currently no separate appointment notes field.

### 2.2 Appointment Management (Doctor/Admin Side)

Doctors and admins can:

- View appointments by doctor/date/status
- Confirm appointment requests
- Decline/cancel appointments
- Update outcome notes from the appointment workflow

State transitions:

- `pending` -> `confirmed` or `declined`
- `pending/confirmed` -> `cancelled` (when cancelled)

### 2.3 Prescription Module (Primary Clinical Document Module)

Prescription capabilities include:

- Prescription header creation
- Multiple prescription items per prescription
- Patient-specific prescription history lookup
- Printable prescription document rendering (HTML)
- Optional patient email notification after prescription creation

Backend objects:

- `prescription_records` (header)
- `prescription_items` (line items)

Supported actions:

- Create prescription (`doctor` and `admin`)
- Fetch one prescription by ID
- Fetch prescription history by patient ID
- Render print view for a prescription

Frontend views:

- `DoctorPrescriptions.jsx` for doctor/admin creation and history review
- `PatientDocuments.jsx` for patient prescription history and print access

## 3. Notifications and Email

### 3.1 Appointment Notifications

Notification events supported:

- Confirmation
- Reminder
- Cancellation
- Update

Recipients:

- Patient
- Doctor (depending on profile/linked user availability and preferences)

Channels:

- In-app portal notifications
- Email notifications

### 3.2 Prescription Notifications

After prescription creation, the backend attempts patient email delivery when email is available and provider config is present.

### 3.3 Email Provider Policy

Email service uses Brevo only.

- Removed: Provider switching logic
- Required vars: `EMAIL_FROM`, `BREVO_API_KEY`
- Response pattern: `sent`, `skipped`, or `failed`

## 4. Removed Module

The legacy financial/invoicing module has been removed from this codebase:

- Routes removed
- Controllers removed
- Frontend components removed
- API integration removed
- Schema artifacts removed

No financial-module runtime logic is expected to remain in active paths.

## 5. Backend Stability Fix

Patient route/controller alignment was corrected:

- `getAllPatients` is now exported by `patientController`
- `getPatientTimelineByPhone` is now exported by `patientController`

This resolves backend startup/runtime failures caused by missing controller handlers expected by `backend/routes/patients.js`.

## 6. API Summary (High-Level)

Primary route groups:

- `/api/auth`
- `/api/schedule`
- `/api/appointments`
- `/api/patients`
- `/api/prescriptions`
- `/api/notifications`
- `/api/analytics`
- `/api/roster`
- `/api/lab`
- `/api/emergency`

Prescription endpoints:

- `POST /api/prescriptions`
- `GET /api/prescriptions/:prescriptionId`
- `GET /api/prescriptions/patient/:patientId`
- `GET /api/prescriptions/:prescriptionId/print`

## 7. Environment and Operations

Backend defaults:

- Port: `1355` unless overridden
- DB: SQLite fallback when MySQL connection vars are not supplied

Email setup (Brevo):

- `EMAIL_FROM=<verified-sender@example.com>`
- `BREVO_API_KEY=<brevo-api-key>`
- Optional: `EMAIL_FROM_NAME=MediAI SmartCare`

## 8. Compliance with Requested Change Set

This implementation state reflects:

- Brevo-only email provider usage
- Financial module removal
- Prescription-first workflows and UI
- Updated documentation with booking-text field clarification
