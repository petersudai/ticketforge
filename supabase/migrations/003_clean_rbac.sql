-- ══════════════════════════════════════════════════════════════════════
-- 003_clean_rbac.sql
-- Run in Supabase dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════
-- Final RBAC cleanup:
--   - Profile.role default = 'organiser' (new signups go through
--     the organiser path; attendees have no DB Profile row at all)
--   - DB trigger now rejects 'attendee' role (attendees have no accounts)
--   - Adds RESEND_* env comment reminder (no SQL change needed)
-- ══════════════════════════════════════════════════════════════════════

-- Update Profile role default to organiser
-- (All authenticated users are organisers or staff — no attendee accounts)
ALTER TABLE public."Profile"
  ALTER COLUMN role SET DEFAULT 'organiser';

-- Update the trigger to only allow valid authenticated roles
-- and explicitly block 'attendee' (since attendees have no accounts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  -- Only allow organiser or staff from metadata; default to organiser.
  -- super_admin is NEVER set via trigger — only via seed-admin script or SQL.
  -- attendee is NEVER set — ticket buyers have no Supabase accounts.
  assigned_role := CASE
    WHEN new.raw_user_meta_data->>'role' = 'staff' THEN 'staff'
    ELSE 'organiser'
  END;

  INSERT INTO public."Profile" (
    "supabaseUserId",
    role,
    "fullName",
    "avatarUrl",
    "createdAt",
    "updatedAt"
  ) VALUES (
    new.id,
    assigned_role,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT ("supabaseUserId") DO NOTHING;

  RETURN new;
END;
$$;

-- Recreate trigger (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Set yourself as Super Admin ───────────────────────────────────────
-- Option A: Use the seed script (recommended):
--   npm run admin:seed your@email.com
--
-- Option B: Manual SQL (run separately after signing up):
--
-- UPDATE public."Profile"
-- SET role = 'super_admin'
-- WHERE "supabaseUserId" = (
--   SELECT id FROM auth.users WHERE email = 'your@email.com'
-- );
--
-- Then sign out and back in for the new role to take effect.
-- ──────────────────────────────────────────────────────────────────────
