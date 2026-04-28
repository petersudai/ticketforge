-- ══════════════════════════════════════════════════════════════════════
-- 002_rbac_v2.sql  — Run in Supabase SQL Editor after 001
-- ══════════════════════════════════════════════════════════════════════
-- Adds columns for staff invite system + payout verification KYC fields.
-- Safe to run multiple times (IF NOT EXISTS guards everywhere).
-- ══════════════════════════════════════════════════════════════════════

-- ── Profile: add phone column ─────────────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='Profile' and column_name='phone'
  ) then
    alter table public."Profile" add column "phone" text;
  end if;
end $$;

-- ── Organisation: payout verification fields ──────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='Organisation' and column_name='payoutVerified'
  ) then
    alter table public."Organisation"
      add column "payoutVerified"   boolean   not null default false,
      add column "payoutVerifiedAt" timestamptz,
      add column "kycStatus"        text      not null default 'none',
      add column "kycSubmittedAt"   timestamptz,
      add column "mpesaNumber"      text;
  end if;
end $$;

-- ── Verification queries ──────────────────────────────────────────────
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('Profile', 'Organisation')
-- order by table_name, ordinal_position;
