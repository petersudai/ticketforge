-- ============================================================
-- fix-security-warnings-v2.sql
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- Previous script likely did nothing because:
--  • handle_new_user: EXECUTE was granted to PUBLIC (the default),
--    so revoking from individual roles left them with access via PUBLIC
--  • Bucket policy: DROP POLICY may have silently failed on name mismatch
-- ============================================================


-- ── Step 1: See what bucket policies actually exist ───────────
-- Run this SELECT first to confirm the exact policy name.
-- Then run Step 2.
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
  AND (qual::text ILIKE '%event-images%' OR with_check::text ILIKE '%event-images%');


-- ── Step 2: Drop the bucket listing policy ────────────────────
-- Replace 'Public read event images' below with the exact name
-- returned by Step 1 if it differs.
DROP POLICY IF EXISTS "Public read event images" ON storage.objects;

-- Belt-and-suspenders: also drop common alternative names
DROP POLICY IF EXISTS "public read event images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Event Images" ON storage.objects;
DROP POLICY IF EXISTS "allow public read" ON storage.objects;


-- ── Step 3: Fix handle_new_user() REST API exposure ──────────
-- The root cause: PostgreSQL grants EXECUTE to PUBLIC by default
-- when a function is created. Revoking from individual roles
-- (anon, authenticated) leaves the PUBLIC grant intact — they
-- still have access through it.
--
-- Revoking from PUBLIC removes it for everyone, including anon
-- and authenticated. The trigger itself is unaffected (triggers
-- fire as the table owner, not through role EXECUTE grants).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Individual role revokes as belt-and-suspenders
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;


-- ── Verify handle_new_user fix ────────────────────────────────
-- Should return zero rows if the revoke worked:
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name   = 'handle_new_user'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
