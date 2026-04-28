-- ══════════════════════════════════════════════════════════════════════
-- 006_marketplace_fixes.sql
-- Run in Supabase dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════
-- Fixes marketplace visibility by ensuring:
--   1. All existing events have published = true (default was true but
--      events created before the schema may have null)
--   2. emailSent and downloadCount exist on Attendee for ticket delivery
-- ══════════════════════════════════════════════════════════════════════

-- Ensure published is not null on existing events
UPDATE public."Event"
SET    "published" = true
WHERE  "published" IS NULL;

-- Set NOT NULL constraint (safe — we just cleared nulls above)
ALTER TABLE public."Event"
  ALTER COLUMN "published" SET NOT NULL,
  ALTER COLUMN "published" SET DEFAULT true;

-- Add emailSent to Attendee if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Attendee' AND column_name = 'emailSent'
  ) THEN
    ALTER TABLE public."Attendee" ADD COLUMN "emailSent" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END;
$$;

-- Add downloadCount to Attendee if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Attendee' AND column_name = 'downloadCount'
  ) THEN
    ALTER TABLE public."Attendee" ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- Add lastDownloadAt to Attendee if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Attendee' AND column_name = 'lastDownloadAt'
  ) THEN
    ALTER TABLE public."Attendee" ADD COLUMN "lastDownloadAt" TIMESTAMPTZ;
  END IF;
END;
$$;

-- ── Verify ────────────────────────────────────────────────────────────
-- SELECT COUNT(*) FROM public."Event" WHERE published = true;
-- SELECT column_name FROM information_schema.columns
-- WHERE  table_schema = 'public' AND table_name = 'Attendee';
