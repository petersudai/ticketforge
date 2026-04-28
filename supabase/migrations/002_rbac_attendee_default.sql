-- ══════════════════════════════════════════════════════════════════════
-- 002_rbac_attendee_default.sql
-- Run this in Supabase dashboard → SQL Editor after 001
-- ══════════════════════════════════════════════════════════════════════
-- Adds phone + category columns to Profile for the organiser upgrade flow.
-- Changes the default role from 'organiser' to 'attendee'.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ══════════════════════════════════════════════════════════════════════

-- Add phone column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'Profile' and column_name = 'phone'
  ) then
    alter table public."Profile" add column "phone" text;
  end if;
end;
$$;

-- Add category column if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'Profile' and column_name = 'category'
  ) then
    alter table public."Profile" add column "category" text;
  end if;
end;
$$;

-- Update default role to 'attendee' for future rows
-- (existing rows are not changed)
alter table public."Profile"
  alter column role set default 'attendee';

-- ── Verification query ────────────────────────────────────────────────
-- select column_name, column_default, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'Profile'
-- order by ordinal_position;
