# Vercel Deployment Guide

Deploy this project as two Vercel projects:

1. `mediai-smartcare/backend` as the Express API.
2. `mediai-smartcare/frontend` as the Vite React app.

## Backend project

Use `mediai-smartcare/backend` as the Vercel project root.

Set these Vercel environment variables for Production and Preview:

```env
NODE_ENV=production
USE_MYSQL=true
DATABASE_URL=<your-hosted-mysql-url>
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
GROQ_API_KEY=<optional-groq-api-key>
```

Do not use the local SQLite database on Vercel. Use Railway MySQL or another hosted MySQL provider.

After the MySQL variables are configured, initialize the database once:

```bash
cd mediai-smartcare/backend
npm install
npm run db:init
```

## Frontend project

Use `mediai-smartcare/frontend` as the Vercel project root.

Use these Vercel build settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

After the backend deployment has a URL, set these frontend environment variables:

```env
VITE_API_BASE_URL=https://your-backend-vercel-url.vercel.app/api
VITE_API_URL=https://your-backend-vercel-url.vercel.app/api
```

Then redeploy the frontend.

## CLI deploy

```bash
npm i -g vercel
vercel login

cd mediai-smartcare/backend
vercel --prod

cd ../frontend
vercel --prod
```
