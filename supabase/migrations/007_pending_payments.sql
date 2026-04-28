-- ══════════════════════════════════════════════════════════════════════
-- 007_pending_payments.sql
-- Run in Supabase dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════
-- Creates the PendingPayment table that bridges M-Pesa STK Push
-- initiation with the callback that creates the Attendee record.
--
-- Also run: npm run db:push  (or npm run db:migrate)
-- to apply the Prisma schema change.
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public."PendingPayment" (
  "id"                 TEXT        NOT NULL PRIMARY KEY,
  "checkoutRequestId"  TEXT        NOT NULL UNIQUE,
  "merchantRequestId"  TEXT,
  "ticketId"           TEXT        NOT NULL UNIQUE,
  "eventId"            TEXT        NOT NULL,
  "tierId"             TEXT        NOT NULL,
  "attendeeName"       TEXT        NOT NULL,
  "attendeeEmail"      TEXT,
  "phone"              TEXT        NOT NULL,
  "expectedAmount"     FLOAT8      NOT NULL,
  "status"             TEXT        NOT NULL DEFAULT 'pending',
  "mpesaReceiptNumber" TEXT,
  "resultDesc"         TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast status polling
CREATE INDEX IF NOT EXISTS "PendingPayment_checkoutRequestId_idx"
  ON public."PendingPayment" ("checkoutRequestId");

-- Index for cleanup jobs (find stale pending payments)
CREATE INDEX IF NOT EXISTS "PendingPayment_status_createdAt_idx"
  ON public."PendingPayment" (status, "createdAt");

-- RLS: PendingPayment is internal — only service_role (Prisma) should access it.
-- Never expose via anon/authenticated Supabase JS client.
ALTER TABLE public."PendingPayment" ENABLE ROW LEVEL SECURITY;

-- No permissive policies = no access for anon/authenticated roles.
-- Prisma uses service_role which bypasses RLS.
