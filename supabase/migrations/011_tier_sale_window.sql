-- Migration 011: tier sale windows, invite tokens, remove color
-- Run: npm run db:push  (Prisma syncs schema to DB)

ALTER TABLE public."Tier"
  ADD COLUMN IF NOT EXISTS "saleStartsAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "saleEndsAt"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "inviteToken"  TEXT;

-- Unique constraint on inviteToken (sparse — only non-null values are unique)
CREATE UNIQUE INDEX IF NOT EXISTS "Tier_inviteToken_key"
  ON public."Tier" ("inviteToken")
  WHERE "inviteToken" IS NOT NULL;

-- Remove color column (data loss acceptable — was cosmetic only)
ALTER TABLE public."Tier"
  DROP COLUMN IF EXISTS "color";
