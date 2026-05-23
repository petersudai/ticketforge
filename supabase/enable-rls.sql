-- ============================================================
-- enable-rls.sql
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
--
-- WHAT THIS DOES
-- --------------
-- Enables Row Level Security (RLS) on every table in the public
-- schema. With RLS enabled and NO permissive policies defined,
-- Supabase's auto-generated PostgREST REST API returns zero rows
-- and blocks all writes for the `anon` and `authenticated` roles.
--
-- This closes the hole where anyone holding the public ANON key
-- could query https://[project].supabase.co/rest/v1/Attendee
-- (or any other table) and read all data without going through
-- the Next.js API routes.
--
-- WHY PRISMA IS NOT AFFECTED
-- --------------------------
-- This app uses Prisma for ALL data access. Prisma connects via
-- DATABASE_URL / DIRECT_URL as the `postgres` role, which is the
-- table owner and a superuser. In PostgreSQL, table owners and
-- superusers bypass RLS automatically (without FORCE ROW LEVEL
-- SECURITY). So every Prisma query continues to work unchanged.
--
-- Supabase's auth endpoints (/auth/v1/*) are handled by a separate
-- GoTrue service — they do NOT go through PostgREST and are not
-- affected by these RLS changes.
--
-- VERIFYING THE FIX
-- -----------------
-- After running this script, go to:
--   Supabase Dashboard → Database → Tables → [any table]
-- The "RLS enabled" badge should appear for every table listed.
--
-- You can also re-run the Security Linter:
--   Supabase Dashboard → Database → Linter
-- All rls_disabled_in_public and sensitive_columns_exposed errors
-- should be gone.
-- ============================================================

ALTER TABLE public."Organisation"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrgMember"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Profile"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Event"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tier"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Attendee"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PendingPayment"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Scan"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StaffInvite"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StaffInviteEvent"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StaffEventAssignment" ENABLE ROW LEVEL SECURITY;
