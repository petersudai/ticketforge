-- Migration 012: Multi-use / group ticket check-in support
-- Adds checkInCount + lastCheckInAt to Attendee for fast counter.
-- Adds entryNumber, scannerId, and undo fields to Scan for full audit trail.

-- ── Attendee additions ────────────────────────────────────────────────
ALTER TABLE "Attendee"
  ADD COLUMN IF NOT EXISTS "checkInCount"  INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastCheckInAt" TIMESTAMP WITH TIME ZONE;

-- Backfill: existing checked-in attendees get checkInCount = 1
UPDATE "Attendee"
SET "checkInCount" = 1
WHERE "checkedIn" = TRUE AND "checkInCount" = 0;

-- ── Scan additions ────────────────────────────────────────────────────
ALTER TABLE "Scan"
  ADD COLUMN IF NOT EXISTS "entryNumber"  INTEGER,
  ADD COLUMN IF NOT EXISTS "scannerId"    TEXT,
  ADD COLUMN IF NOT EXISTS "undoneAt"     TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "undoneBy"     TEXT,
  ADD COLUMN IF NOT EXISTS "undoneReason" TEXT;

-- Backfill entryNumber = 1 for existing valid scans where attendee was checked in
UPDATE "Scan"
SET "entryNumber" = 1
WHERE result IN ('valid', 'override') AND "entryNumber" IS NULL;

-- Index for fast lookup of latest valid scan per attendee (used in undo logic)
CREATE INDEX IF NOT EXISTS "Scan_attendeeId_scannedAt_idx"
  ON "Scan" ("attendeeId", "scannedAt" DESC);

-- Index for dashboard queries filtering by eventId + result
CREATE INDEX IF NOT EXISTS "Scan_eventId_result_idx"
  ON "Scan" ("eventId", result);
