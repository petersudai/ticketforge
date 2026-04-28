# TicketForge Pro

A full-stack event ticketing platform built with Next.js 14, Tailwind CSS v4, and Zustand.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 |
| State | Zustand + localStorage (dev) / Prisma + PostgreSQL (prod) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Database | Prisma (SQLite dev → PostgreSQL prod) |
| QR Codes | `qrcode` + `jsqr` (scan decode) |
| Ticket Export | `jspdf` + `html2canvas` |
| Payments | Safaricom Daraja API (M-Pesa STK Push) |
| Email | EmailJS (200/month free) |
| Fonts | Syne · DM Sans · DM Mono |

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:3000
```

> **Note:** The app works fully out of the box using Zustand + localStorage.
> Prisma + PostgreSQL is optional and only needed for multi-device sync in production.

## Project Structure

```
ticketforge/
├── app/
│   ├── (dashboard)/              # Admin UI — all behind the sidebar
│   │   ├── page.tsx              # Dashboard (event list + KPIs)
│   │   ├── layout.tsx            # Sidebar + Topbar shell
│   │   ├── events/
│   │   │   ├── page.tsx          # Redirects to dashboard
│   │   │   ├── new/page.tsx      # Create new event
│   │   │   └── edit/[id]/        # Edit/view existing event
│   │   ├── attendees/page.tsx    # Manage attendees, CSV import/export
│   │   ├── tickets/page.tsx      # Print/download tickets (PNG + PDF)
│   │   ├── email/page.tsx        # EmailJS delivery
│   │   ├── public-page/page.tsx  # Preview public event page
│   │   ├── revenue/page.tsx      # Revenue dashboard (Recharts)
│   │   ├── analytics/page.tsx    # Check-in analytics
│   │   └── settings/page.tsx     # PIN, fee, data management
│   ├── events/[slug]/page.tsx    # Public attendee registration page
│   ├── scanner/page.tsx          # Gate scanner (standalone dark page)
│   └── api/
│       ├── events/route.ts       # CRUD events
│       ├── events/[id]/route.ts
│       ├── attendees/route.ts    # CRUD attendees
│       ├── attendees/[id]/route.ts
│       ├── scan/route.ts         # Scan verification + DB log
│       ├── mpesa/route.ts        # STK Push initiation
│       ├── mpesa/callback/       # Safaricom payment callback
│       ├── mpesa/status/         # Poll payment status
│       └── tickets/generate/     # Server-side ticket HTML + QR
├── components/
│   ├── ui/index.tsx              # Button, Card, Badge, Input, StatCard…
│   ├── layout/Sidebar.tsx        # Navigation sidebar
│   └── layout/Topbar.tsx         # Header with live stats
├── store/useStore.ts             # Zustand global store (all app state)
├── lib/
│   ├── utils.ts                  # genTicketId, formatDate, slugify…
│   ├── db.ts                     # Prisma client singleton
│   ├── mpesa.ts                  # Daraja STK Push helpers
│   ├── qr.ts                     # QR generation + parsing
│   └── email.ts                  # EmailJS helpers + HTML templates
├── prisma/schema.prisma          # DB schema (Event, Tier, Attendee, Scan)
└── .env.example                  # All environment variables documented
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Key variables:

```env
DATABASE_URL="file:./dev.db"           # SQLite (dev) or postgres:// (prod)
MPESA_CONSUMER_KEY="..."               # From developer.safaricom.co.ke
MPESA_CONSUMER_SECRET="..."
MPESA_SHORTCODE="174379"
MPESA_PASSKEY="..."
MPESA_CALLBACK_URL="https://yoursite.com/api/mpesa/callback"
OVERRIDE_PIN="1234"                    # Gate scanner override PIN
PLATFORM_FEE_PERCENT="2.5"
```

## M-Pesa Setup

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create app → enable **M-Pesa Express (STK Push)**
3. Copy Consumer Key, Consumer Secret, Shortcode, Passkey
4. Add to `.env.local`
5. For local testing: use [ngrok](https://ngrok.com) to expose your callback URL
6. Test on sandbox → apply for production access

## Database (Production)

```bash
# Switch to PostgreSQL in .env.local:
# DATABASE_URL="postgresql://..."

npx prisma generate
npx prisma db push

# Or with migrations:
npx prisma migrate dev --name init
```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy

# Set environment variables in Vercel dashboard, then:
vercel --prod
```

## Gate Scanner

Open `/scanner` on any phone at the venue — no app install needed:

- Select your event from the dropdown
- Tap **Start camera** to begin scanning
- First scan: **✓ Valid** — attendee is checked in
- Duplicate scan: **⚠ Duplicate** — requires Override PIN
- Invalid ticket: **✕ Invalid** — not found or wrong event
- Manual entry: type a ticket ID and tap Verify

Default override PIN: `1234` — change it in Settings before your event.

## Ticket Formats

Each ticket includes:
- Event name, date, time, venue
- Attendee name and tier badge
- 6-field info grid (seat, payment status, etc.)
- Perforated tear line with notch cutouts
- Real scannable QR code (encoded: `TICKETFORGE|ID:...|EVENT:...|ATTENDEE:...|DATE:...`)
- Decorative barcode strip
- Unique ticket ID in monospace font
- TicketForge watermark

Download as **PNG** (3× retina) or **PDF** (A4 portrait). Print all tickets at once as a merged multi-page PDF.

## License

MIT

## Marketing & Marketplace (added v2)

### New routes

| Route | Description |
|---|---|
| `/` | Marketing homepage (10 sections) |
| `/marketplace` | Public event marketplace with search & filter |
| `/dashboard` | Admin dashboard (moved from `/`) |

### Homepage sections
- **Hero** — headline, sub, dual CTA, dashboard preview mockup
- **Trust bar** — technology logos
- **Features** — 9-feature grid with icons and hover glow
- **How it works** — parallel organiser / attendee step flows
- **Stats** — animated KPI counters
- **Benefits** — dual-column organiser vs attendee breakdown
- **Pricing** — 3-tier (Starter / Pro / Enterprise) with feature lists
- **Testimonials** — 6-card testimonial grid
- **FAQ** — 8-question accordion
- **Final CTA** — conversion banner with gradient background

### Marketplace features
- Search by name, venue, organiser
- Filter by event category (7 categories)
- Sort by date, price (low/high), popularity
- Live event cards with capacity bars, tier previews, availability
- Placeholder example cards when no events exist
- "Host an event" organiser CTA banner

### Components added
- `components/marketing/Nav.tsx` — scroll-aware sticky nav with mobile drawer
- `components/marketing/Footer.tsx` — 5-column footer with links

### What was NOT changed
- All existing dashboard pages (`/attendees`, `/tickets`, `/revenue`, etc.)
- All API routes
- Zustand store
- Prisma schema
- Scanner page
- Public event registration page (`/events/[slug]`)
- QR, email, M-Pesa helpers
