-- ══════════════════════════════════════════════════════════════════════
-- 010_tier_capacity.sql
-- Adds capacity (people admitted per ticket) to the Tier table.
-- 1 = solo ticket (default), 2 = couple, 4 = group of 4, etc.
-- Run in Supabase dashboard → SQL Editor, then: npm run db:push && npm run db:generate
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public."Tier"
  ADD COLUMN IF NOT EXISTS "capacity" INTEGER NOT NULL DEFAULT 1;
