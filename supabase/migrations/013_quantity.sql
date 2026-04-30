-- Migration 013: Add quantity to PendingPayment
-- Enables multi-ticket purchases in a single M-Pesa STK push.
-- Existing rows default to 1 (single ticket, no behaviour change).

ALTER TABLE "PendingPayment"
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
