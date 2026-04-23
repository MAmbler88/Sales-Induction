# OnboardIQ — Sales Induction Platform

A full-stack training platform for sales agents. Admins create modules (YouTube videos + quizzes), manage agents, and track progress. Agents complete modules sequentially and sit quizzes.

## Tech stack
- **Frontend**: React + Vite + React Router
- **Backend/Auth/DB**: Supabase (free tier works)
- **Hosting**: Vercel (free tier works)

---

## Setup guide (takes ~15 minutes)

### Step 1 — Create a Supabase project
1. Go to https://supabase.com → create a free account
2. Click **New project**, give it a name, pick a region, set a DB password
3. Wait ~2 minutes for provisioning

### Step 2 — Run the database schema
1. In Supabase → **SQL Editor → New query**
2. Paste the full contents of `supabase-schema.sql` and click **Run**

### Step 3 — Get your Supabase credentials
1. Go to **Project Settings → API**
2. Copy your **Project URL** and **anon public** key

### Step 4 — Configure environment variables
```
cp .env.example .env
```
Fill in:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Step 5 — Create your first admin user
1. In Supabase → **Authentication → Users → Add user → Create new user**
2. Enter your email and password
3. In SQL Editor, run:
```sql
update public.profiles set role = 'admin' where email = 'your@email.com';
```

### Step 6 — Run locally
```bash
npm install
npm run dev
```
Visit http://localhost:5173 and sign in.

---

## Deploy to Vercel
1. Push this repo to GitHub
2. Import at https://vercel.com
3. Add environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Deploy

> In Supabase → Authentication → URL Configuration, add your Vercel domain to **Redirect URLs**: `https://your-app.vercel.app/**`

---

## How to use

**As admin:**
- **Agents** → Create agent accounts (name, email, password)
- **Modules** → Add modules with title, YouTube URL; publish when ready
- **Modules → Edit quiz** → Add questions with 4 options, mark the correct answer
- **Progress** → See a live grid of every agent vs every module

**As agent:**
- Log in with credentials given by admin
- Complete modules in order — each unlocks after passing the previous quiz
- Watch video → take quiz (70% to pass by default)

---

## Project structure
```
src/
  hooks/useAuth.jsx        Auth context
  lib/supabase.js          Supabase client
  pages/
    Login.jsx              Login screen
    AdminDashboard.jsx     Admin stats
    AdminModules.jsx       Module + quiz editor
    AdminAgents.jsx        Agent account manager
    AdminProgress.jsx      Progress tracker
    AgentTraining.jsx      Agent experience
  components/Sidebar.jsx   Navigation
  index.css                Global styles
supabase-schema.sql        Run once in Supabase SQL Editor
```
