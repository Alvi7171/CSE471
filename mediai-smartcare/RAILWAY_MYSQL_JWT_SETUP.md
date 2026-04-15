# Railway MySQL + JWT Setup Guide

## 1) Create Railway MySQL service

1. Open Railway and create a new project.
2. Add a MySQL service.
3. Open the MySQL service and copy these variables:
   - MYSQLHOST
   - MYSQLPORT
   - MYSQLUSER
   - MYSQLPASSWORD
   - MYSQLDATABASE

## 2) Configure backend environment

Create or update backend/.env:

PORT=1355
NODE_ENV=development

DB_HOST=<MYSQLHOST>
DB_PORT=<MYSQLPORT>
DB_USER=<MYSQLUSER>
DB_PASSWORD=<MYSQLPASSWORD>
DB_NAME=<MYSQLDATABASE>
DB_SSL=true
DB_CONNECTION_LIMIT=10

JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d

GROQ_API_KEY=<your-groq-api-key>

## 3) Install dependencies

From backend:

npm install

From frontend:

npm install

## 4) Initialize MySQL tables and seed users

From backend:

npm run db:init

Expected seed users:

- admin@mediai.com / Admin@123
- doctor@mediai.com / Doctor@123
- patient@mediai.com / Patient@123

## 5) Start backend and frontend

Backend:

npm start

Frontend:

npm run dev

## 6) If db:init fails with CREATE permission denied

Your current DB user cannot create tables. Fix with one of these:

1. Use Railway service credentials from the same MySQL service Variables tab.
2. Confirm DB_NAME matches the database that user can write to.
3. Open Railway MySQL shell and grant create/table privileges to your user.
4. Re-run:

npm run db:init

## 7) Role-based behavior implemented

- patient: AI symptom checker + book appointment
- doctor: doctor schedule management
- admin: doctor schedule + admin placeholder endpoint/UI

## 8) Auth API summary

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

JWT must be sent as:
Authorization: Bearer <token>
