# TicketForge — Setup Guide

## Quick start (no database, dev only)
```bash
npm install
npm run dev   # Works immediately — uses Zustand/localStorage
```
Visit `http://localhost:3000` — dashboard is open (BYPASS_AUTH=true in .env.local).

---

## Step 1 — Supabase database + auth

### 1a. Get your Supabase API keys
1. Go to [app.supabase.com](https://app.supabase.com) → your project
2. **Settings → API**
3. Copy:
   - **Project URL**: `https://bhfrbrgdzdgxlrfphigs.supabase.co`
   - **anon / public key**: `eyJh...` (the long one)

### 1b. Add to `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL="https://bhfrbrgdzdgxlrfphigs.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."   ← paste your anon key here
```

### 1c. Push the database schema
```bash
# First update .env.local with your database password:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@..."
# DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@..."

npm run db:push      # pushes schema to Supabase
npm run db:generate  # ← CRITICAL: regenerates the Prisma TypeScript client
                     #   Without this, tier/event API routes return 503
```

**Important:** Any time you pull updated code with schema changes, run both commands:
```bash
npm run db:push && npm run db:generate
```
Then restart the dev server. The Prisma client must be regenerated after every schema change
or API routes will fail with 503 errors because the client doesn't know about new columns.

### 1d. Enable Email auth + turn off email confirmation (for local testing)
1. Supabase dashboard → **Authentication → Providers → Email**
2. Toggle **Enable Email provider** → ON
3. Toggle **Confirm email** → OFF *(lets you sign up without checking email during dev)*
4. Save

### 1e. Restart your dev server
```bash
# Stop server (Ctrl+C), then:
npm run dev
```
Registration at `/auth/signup` now works — accounts are stored in Supabase.

---

## Step 2 — Google OAuth

### 2a. Create Google OAuth credentials
1. [console.cloud.google.com](https://console.cloud.google.com) → New project: `TicketForge`
2. **APIs & Services → OAuth consent screen** → External → Create
3. Fill in App name, support email, developer email → Save & Continue
4. **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. **Authorized redirect URIs** — add BOTH:
   ```
   http://localhost:3000/auth/callback
   https://bhfrbrgdzdgxlrfphigs.supabase.co/auth/v1/callback
   ```
7. Click **Create** → copy **Client ID** and **Client Secret**

### 2b. Add Google to Supabase Auth
1. Supabase dashboard → **Authentication → Providers → Google**
2. Toggle **Enable Google provider** → ON
3. Paste **Client ID** and **Client Secret**
4. Authorized Client IDs: paste just the Client ID again
5. Save

### 2c. Set Supabase redirect URLs
1. Supabase dashboard → **Authentication → URL Configuration**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs** — add:
   ```
   http://localhost:3000/**
   https://yourdomain.com/**
   ```
4. Save

### 2d. Enable Google button in the app
```env
# .env.local — add this line:
NEXT_PUBLIC_GOOGLE_ENABLED="true"
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
```

### 2e. Restart dev server
The Google button now appears on `/auth/login` and `/auth/signup`.

---

## Step 3 — Production deployment (Vercel)

### Environment variables to set in Vercel dashboard:
```env
# Auth
BYPASS_AUTH="false"                          ← CRITICAL
AUTH_SECRET="openssl rand -base64 32"
AUTH_URL="https://yourdomain.com"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://bhfrbrgdzdgxlrfphigs.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJh..."
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://postgres:PASSWORD@db.bhfrbrgdzdgxlrfphigs.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.bhfrbrgdzdgxlrfphigs.supabase.co:5432/postgres"

# Google
NEXT_PUBLIC_GOOGLE_ENABLED="true"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# M-Pesa (switch to production)
MPESA_ENV="production"
MPESA_CONSUMER_KEY="..."
MPESA_CONSUMER_SECRET="..."
MPESA_SHORTCODE="your-shortcode"
MPESA_PASSKEY="your-passkey"
MPESA_CALLBACK_URL="https://yourdomain.com/api/mpesa/callback"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_GOOGLE_ENABLED="true"
OVERRIDE_PIN="your-secure-pin"
PLATFORM_FEE_PERCENT="2.5"
```

### After deploying:
1. Update Supabase → Authentication → URL Configuration:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: add `https://yourdomain.com/**`
2. Update Google Console → Authorized redirect URIs:
   - Add `https://yourdomain.com/auth/callback`
   - Add `https://bhfrbrgdzdgxlrfphigs.supabase.co/auth/v1/callback`

---

## Current .env.local template

```env
# Developer bypass — remove before going live
BYPASS_AUTH="true"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://bhfrbrgdzdgxlrfphigs.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""              ← paste from Supabase Settings → API

# Database (SQLite for local dev)
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"

# NextAuth
AUTH_SECRET="dev-secret-change-in-production-min32chars!!"
AUTH_URL="http://localhost:3000"

# Google (hidden until you set NEXT_PUBLIC_GOOGLE_ENABLED=true)
NEXT_PUBLIC_GOOGLE_ENABLED="false"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# M-Pesa (sandbox)
MPESA_ENV="sandbox"
MPESA_CONSUMER_KEY=""
MPESA_CONSUMER_SECRET=""
MPESA_SHORTCODE="174379"
MPESA_PASSKEY=""
MPESA_CALLBACK_URL="http://localhost:3000/api/mpesa/callback"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OVERRIDE_PIN="1234"
PLATFORM_FEE_PERCENT="2.5"
DEMO_EMAIL="demo@ticketforge.app"
DEMO_PASSWORD="TicketForgeDemo2025"
```
