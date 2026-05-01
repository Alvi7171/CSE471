# MediAI SmartCare

React + Express hospital management system with role-based workflows for patients, doctors, and admins.

## Current Product Focus

This codebase is now prescription-focused.

- Billing is removed from backend, frontend, and documentation.
- Prescription creation, prescription history, and printable prescription output are active.
- Email delivery is Brevo-only.

## Core Features

### 1. Patient Appointment Booking

Patients can:

- Select a date
- View available doctors
- Load available slots
- Choose a slot
- Submit one free-text clinical description

Patients enter one free-text description during booking, and the system stores it in the symptoms field; there is currently no separate appointment notes field.

Backend behavior:

- Validates doctor schedule and slot boundaries
- Prevents double-booking conflicts
- Stores appointment as pending
- Dispatches appointment notifications

### 2. Prescription Module

Doctors and admins can:

- Create prescription records (header + medicine items)
- Attach diagnosis, advice, and notes
- Fetch patient prescription history
- Open printable prescription HTML

Patients can:

- View prescription history
- Print prescriptions from the portal

### 3. Appointment Management and Notifications

Doctors can:

- View appointments
- Confirm or decline appointments
- Update appointment outcomes

System notifications include:

- Appointment confirmation
- Appointment reminder
- Appointment cancellation/update
- Prescription creation email notification (optional, based on config)

## Tech Stack

- Frontend: React, Vite, TailwindCSS
- Backend: Node.js, Express
- Database: SQLite (default fallback) or MySQL
- Auth: JWT
- Email: Brevo SMTP API

## Email Configuration (Brevo Only)

Set these backend environment variables:

- `EMAIL_FROM`
- `BREVO_API_KEY`
- Optional: `EMAIL_FROM_NAME`

If `EMAIL_FROM` or `BREVO_API_KEY` is missing, email delivery is skipped with a structured status response.

## Project Structure

```text
mediai-smartcare/
  backend/
    controllers/
    routes/
    services/
    utils/
    models/
    server.js
  frontend/
    src/
      components/
      services/
      App.jsx
```

## Run Locally

### Backend

```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:1355`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on Vite default host/port unless overridden.

## Main API Groups

- `/api/auth`
- `/api/appointments`
- `/api/schedule`
- `/api/patients`
- `/api/prescriptions`
- `/api/notifications`
- `/api/analytics`
- `/api/roster`
- `/api/lab`
- `/api/emergency`

## Notes

- Billing APIs and UI are intentionally removed.
- Brevo is the only email provider used by this version.
