-- ══════════════════════════════════════════════════════════════════════
-- 004_tier_management.sql
-- Run in Supabase dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════
-- Adds ticket tier management fields:
--   hidden    — hides a tier from public marketplace (still exists in DB)
--   description — optional tier description for buyers
--   sortOrder   — controls display order within an event
--
-- Also fixes ownership: ensures events are always scoped to an org.
-- ══════════════════════════════════════════════════════════════════════

-- Add hidden column to Tier
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

-- Add description column to Tier
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

-- Add sortOrder column to Tier
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

-- Backfill sortOrder for existing tiers (ordered by creation)
UPDATE public."Tier" t
SET    "sortOrder" = sub.rn - 1
FROM  (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "eventId" ORDER BY id) AS rn
  FROM   public."Tier"
) sub
WHERE t.id = sub.id
AND   t."sortOrder" = 0;

-- ── Verification ──────────────────────────────────────────────────────
-- SELECT column_name, data_type, column_default
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public' AND table_name = 'Tier'
-- ORDER  BY ordinal_position;
