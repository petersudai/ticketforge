-- Migration 015: Add endDate to Event for multi-day event support
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "endDate" TEXT;
