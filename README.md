# TicketForge

A production-grade event ticketing platform built for the African market. M-Pesa payments, QR-coded tickets, gate scanner, multi-tenant RBAC, and a public marketplace.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Prisma 7 · PostgreSQL (Supabase) · Supabase Auth · Tailwind CSS v4 · Zustand

## Quick Start

```bash
cp .env.example .env.local   # fill in credentials
npm install
npm run db:push              # sync Prisma schema to DB
npm run dev
```

## Environment Variables

See `.env.example` for the full list. The minimum required to run locally:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `MPESA_CONSUMER_KEY` | Daraja API consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja API consumer secret |
| `MPESA_SHORTCODE` | M-Pesa shortcode (paybill or till) |
| `MPESA_PASSKEY` | Daraja STK Push passkey |
| `MPESA_CALLBACK_URL` | Public URL for Safaricom callback (use ngrok locally) |

## M-Pesa Setup

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app and enable **M-Pesa Express (STK Push)**
3. Copy your Consumer Key, Consumer Secret, Shortcode, and Passkey into `.env.local`
4. For local testing, expose your callback URL with [ngrok](https://ngrok.com)
5. Test on sandbox before applying for production access

## Database

```bash
npm run db:push          # push schema changes (no migration file)
npm run db:migrate       # create a named migration
npm run db:studio        # open Prisma Studio
```

## Gate Scanner

Open `/scanner` on any phone at the venue — no app install needed.

- Select your event from the dropdown
- Tap **Start camera** to begin scanning
- First scan: check-in confirmed
- Duplicate scan: prompts for the override PIN (set in Settings)
- Invalid ticket: rejected with reason

Set your override PIN in **Settings** before your first event.

## Deploy

The app is designed for Vercel + Supabase. Set all environment variables in the Vercel dashboard, then:

```bash
vercel --prod
```

## License

MIT
