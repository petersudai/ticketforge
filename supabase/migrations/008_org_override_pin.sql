-- ══════════════════════════════════════════════════════════════════════
-- 008_org_override_pin.sql
-- Adds overridePin column to Organisation for server-side PIN storage.
-- Run in Supabase dashboard → SQL Editor, then: npm run db:push
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public."Organisation"
  ADD COLUMN IF NOT EXISTS "overridePin" TEXT NOT NULL DEFAULT '1234';
