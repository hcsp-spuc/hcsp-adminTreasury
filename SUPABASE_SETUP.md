# Supabase Setup Guide — SPUC Treasury

---

## Step 1: Create a Supabase Account

1. Go to https://supabase.com
2. Click **Start your project**
3. Sign up using your GitHub account or email
4. Verify your email if prompted

---

## Step 2: Create a New Project

1. Once logged in, click **New Project**
2. Fill in the details:
   - **Organization** — select or create one (e.g., `SPUC`)
   - **Project Name** — e.g., `spuc-treasury`
   - **Database Password** — set a strong password and **save it somewhere safe**
   - **Region** — choose the closest to your location (e.g., `Southeast Asia (Singapore)`)
3. Click **Create new project**
4. Wait 1–2 minutes for Supabase to provision your database

---

## Step 3: Run the Database Schema

1. On the left sidebar, click **SQL Editor**
2. Click **New query**
3. Open `schema.sql` from your project folder
4. Copy **all** the contents
5. Paste it into the SQL Editor
6. Click **Run** (or press `Ctrl + Enter`)
7. You should see a success message at the bottom

### Verify Tables Were Created
1. On the left sidebar, click **Table Editor**
2. You should see all 10 tables:
   - `tbl_superadmin`
   - `tbl_admin`
   - `tbl_mission`
   - `tbl_fiscal_year`
   - `tbl_budget`
   - `tbl_tithes`
   - `tbl_offerings`
   - `tbl_reconciliation`
   - `tbl_financial_stmt`
   - `tbl_reportHistory`

---

## Step 4: Get Your API Keys

1. On the left sidebar, click **Project Settings** (gear icon)
2. Click **API**
3. Copy the following and save them:
   - **Project URL** → this is your `SUPABASE_URL`
   - **service_role** key (under Project API keys) → this is your `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Never expose the `service_role` key on the frontend. It is for backend (Node.js) use only.

---

## Step 5: Configure Your .env File

1. In your project folder, duplicate `.env.example` and rename it to `.env`
2. Fill in the values you copied from Step 4:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=any-random-strong-secret-string
PORT=3000
```

---

## Step 6: Install Dependencies & Test Connection

1. Open a terminal in your project folder
2. Run:
   ```bash
   npm install
   ```
3. Create a quick test file `test-connection.js`:
   ```js
   require('dotenv').config();
   const supabase = require('./db');

   async function test() {
     const { data, error } = await supabase.from('tbl_fiscal_year').select('*');
     if (error) return console.error('Connection failed:', error.message);
     console.log('Connection successful! Data:', data);
   }

   test();
   ```
4. Run it:
   ```bash
   node test-connection.js
   ```
5. If you see `Connection successful!` — your Node.js backend is connected to Supabase ✅

---

## Summary

| Step | What You Did |
|------|-------------|
| 1 | Created a Supabase account |
| 2 | Created a new Supabase project |
| 3 | Ran `schema.sql` to create all 10 tables |
| 4 | Copied your API URL and service role key |
| 5 | Configured your `.env` file |
| 6 | Installed dependencies and tested the connection |
