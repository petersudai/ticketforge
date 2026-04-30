-- Migration 014: Order architecture + endTime + Attendee expansion fields
-- Run this against your Postgres database.

-- Add endTime to Event
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "endTime" TEXT;

-- Add Order-architecture columns to Attendee
ALTER TABLE "Attendee"
  ADD COLUMN IF NOT EXISTS "orderId"     TEXT,
  ADD COLUMN IF NOT EXISTS "maxCheckIns" INTEGER,
  ADD COLUMN IF NOT EXISTS "slotIndex"   INTEGER NOT NULL DEFAULT 0;

-- Add orderId to PendingPayment
ALTER TABLE "PendingPayment"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT;

-- Create Order table
CREATE TABLE IF NOT EXISTS "Order" (
  "id"                 TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "eventId"            TEXT         NOT NULL,
  "tierId"             TEXT         NOT NULL,
  "buyerName"          TEXT         NOT NULL,
  "buyerEmail"         TEXT,
  "buyerPhone"         TEXT         NOT NULL,
  "totalPaid"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"           TEXT         NOT NULL DEFAULT 'KES',
  "mpesaReceiptNumber" TEXT,
  "payStatus"          TEXT         NOT NULL DEFAULT 'pending',
  "quantity"           INTEGER      NOT NULL DEFAULT 1,
  "ticketCount"        INTEGER      NOT NULL DEFAULT 1,
  "createdAt"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE,
  CONSTRAINT "Order_tierId_fkey"  FOREIGN KEY ("tierId")  REFERENCES "Tier"("id")
);

-- FK from Attendee to Order (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Attendee_orderId_fkey'
      AND table_name = 'Attendee'
  ) THEN
    ALTER TABLE "Attendee"
      ADD CONSTRAINT "Attendee_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id");
  END IF;
END $$;

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS "Order_eventId_idx"  ON "Order"("eventId");
CREATE INDEX IF NOT EXISTS "Order_tierId_idx"   ON "Order"("tierId");
CREATE INDEX IF NOT EXISTS "Attendee_orderId_idx" ON "Attendee"("orderId");
CREATE INDEX IF NOT EXISTS "Attendee_slotIndex_idx" ON "Attendee"("tierId", "slotIndex");
