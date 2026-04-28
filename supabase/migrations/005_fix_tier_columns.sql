-- ══════════════════════════════════════════════════════════════════════
-- 005_fix_tier_columns.sql
-- Run this in Supabase dashboard → SQL Editor if the tier PATCH
-- returns 503/500 errors after the schema update.
--
-- This is equivalent to running:  npm run db:push
-- (which re-runs Prisma against the live database)
-- ══════════════════════════════════════════════════════════════════════
-- The 503 error on PATCH /api/tiers/[id] was caused by:
--   1. The Prisma client not knowing about the new Tier columns
--      (hidden, description, sortOrder) because db:generate / db:push
--      hadn't been run after the schema change.
--   2. The ownership check reading a JWT field (user_metadata.org_id)
--      that doesn't exist — fixed in code, not SQL.
--
-- If you already ran migration 004_tier_management.sql, these columns
-- exist. This file is a safety net for environments where 004 wasn't run.
-- ══════════════════════════════════════════════════════════════════════

-- Add hidden column to Tier (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Tier' AND column_name = 'hidden'
  ) THEN
    ALTER TABLE public."Tier" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END;
$$;

-- Add description column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Tier' AND column_name = 'description'
  ) THEN
    ALTER TABLE public."Tier" ADD COLUMN "description" TEXT;
  END IF;
END;
$$;

-- Add sortOrder column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Tier' AND column_name = 'sortOrder'
  ) THEN
    ALTER TABLE public."Tier" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- After running this, regenerate the Prisma client:
--   npm run db:generate
-- Then restart your dev server:
--   npm run dev

-- ── Verify ────────────────────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'Tier'
-- ORDER BY ordinal_position;
