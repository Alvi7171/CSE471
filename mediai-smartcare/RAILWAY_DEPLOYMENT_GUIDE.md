# Railway Deployment Guide (Frontend + Backend + MySQL)

This guide is for first-time deployment of a Node/Express backend and a Vite frontend on Railway, using an existing MySQL database already deployed on Railway.

## Before you start

1) Make sure your project is pushed to GitHub.
2) Confirm your Railway MySQL service is running and you can see its connection info (host, port, user, password, database name).

## Part A - Deploy the backend (Node/Express)

### A1) Create a Railway project and backend service

1) Go to https://railway.app and sign in.
2) Click "New Project" -> "Deploy from GitHub Repo".
3) Choose your repo and select the backend folder as the root directory.

### A2) Configure build and start commands

1) Open the backend service settings in Railway.
2) Set the build command:
   - npm install
3) Set the start command:
   - node server.js
   (If your backend uses a different start script, update it accordingly.)

### A3) Add backend environment variables

1) Open the backend service -> Variables.
2) Add the following variables (replace with your real values):

- DB_HOST = <your Railway MySQL host>
- DB_PORT = <your Railway MySQL port>
- DB_USER = <your Railway MySQL user>
- DB_PASSWORD = <your Railway MySQL password>
- DB_NAME = <your Railway MySQL database name>
- JWT_SECRET = <any strong random string>
- PORT = 3000

3) Add any other variables your backend uses (email, AI API keys, etc.).

### A4) Deploy and copy the backend URL

1) Trigger a deploy (Railway usually auto-deploys).
2) After deploy, copy the public backend URL (for example: https://your-backend.up.railway.app).

## Part B - Deploy the frontend (Vite)

### B1) Create a separate frontend service

1) In the same Railway project, click "New Service" -> "Deploy from GitHub Repo".
2) Choose the same repo and set the frontend folder as the root directory.

### B2) Configure build and start commands

1) Open the frontend service settings.
2) Set the build command:
   - npm install && npm run build
3) Set the start command:
   - npm run preview -- --host 0.0.0.0 --port $PORT

### B3) Add frontend environment variables

1) Open the frontend service -> Variables.
2) Add:

- VITE_API_BASE_URL = <your backend URL>

3) Redeploy the frontend so the new variable is included in the build.

## Part C - Common checks and fixes

1) If requests fail with CORS errors, allow the frontend URL in your backend CORS config.
2) Make sure the backend uses the Railway-injected PORT if your code reads PORT from env.
3) Vite reads VITE_ variables at build time, so always redeploy after editing variables.

## Part D - Local development tips (optional)

1) Keep local .env files for dev only. Do not commit them.
2) Backend local .env example:

- DB_HOST=localhost
- DB_PORT=3306
- DB_USER=root
- DB_PASSWORD=yourpassword
- DB_NAME=yourdbname
- JWT_SECRET=devsecret

3) Frontend local .env example:

- VITE_API_BASE_URL=http://localhost:3000

## Done

You should now have:
- Backend deployed and connected to Railway MySQL
- Frontend deployed and pointing to your backend

If you want, tell me your backend start script and your current env keys, and I will tailor this guide to your exact setup.
