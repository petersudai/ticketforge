-- ══════════════════════════════════════════════════════════════════════
-- 001_profiles_trigger.sql
-- Run this ONCE in Supabase dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════
-- Creates a trigger that automatically inserts a row into the public
-- "Profile" table whenever a new user signs up via Supabase Auth.
--
-- RBAC model:
--   All self-signups → role = 'organiser' (they came through the
--   organiser signup page — no attendee accounts exist)
--   Staff accounts   → created via invite flow with role = 'staff'
--   Super Admin      → set manually via SQL (see below)
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
begin
  -- Honour explicit role in metadata (staff invite flow sets role='staff'),
  -- but NEVER allow 'super_admin' to be self-assigned via metadata.
  -- Default for all self-signups is 'organiser'.
  v_role := coalesce(new.raw_user_meta_data->>'role', 'organiser');
  if v_role not in ('organiser', 'staff') then
    v_role := 'organiser';
  end if;

  -- Wrapped in its own sub-block so any insert failure is logged but never
  -- blocks auth.users creation. "Database error saving new user" was caused
  -- by the id column having no database-level DEFAULT (Prisma generates cuid()
  -- in application code, not in Postgres). We use gen_random_uuid() here.
  begin
    insert into public."Profile" (
      id,
      "supabaseUserId",
      role,
      "fullName",
      "avatarUrl",
      "createdAt",
      "updatedAt"
    ) values (
      gen_random_uuid()::text,
      new.id,
      v_role,
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        ''
      ),
      new.raw_user_meta_data->>'avatar_url',
      now(),
      now()
    )
    on conflict ("supabaseUserId") do nothing;
  exception when others then
    -- Log the error but never let a Profile insert failure block signup
    raise warning 'handle_new_user: Profile insert failed for user %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- Drop trigger if it already exists (safe to re-run)
drop trigger if exists on_auth_user_created on auth.users;

-- Trigger: fires after INSERT on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
