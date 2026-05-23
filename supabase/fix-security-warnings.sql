-- ============================================================
-- fix-security-warnings.sql
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
--
-- Fixes three of the four remaining security warnings from the
-- Supabase Database Linter. The fourth (leaked password protection)
-- is a dashboard toggle:
--   Auth → Sign In / Up → Password → Enable leaked password protection
-- ============================================================


-- ── Fix 1: event-images bucket listing ───────────────────────
--
-- The "Public read event images" SELECT policy on storage.objects
-- grants bucket listing (directory traversal) to anyone with the
-- anon key, not just URL-based image reads.
--
-- Public buckets in Supabase allow object URL access without any
-- storage.objects policy — the policy is only needed for listing.
-- Removing it keeps all image URLs working while closing the
-- directory enumeration hole.
--
DROP POLICY IF EXISTS "Public read event images" ON storage.objects;


-- ── Fix 2 & 3: handle_new_user() callable via REST API ───────
--
-- handle_new_user() is a SECURITY DEFINER trigger function —
-- it runs with the privileges of its creator (postgres/superuser).
-- It should only ever be invoked by a database trigger, never
-- called directly by a client.
--
-- PostgREST exposes it at /rest/v1/rpc/handle_new_user, which
-- means any anon or authenticated client can invoke it with
-- superuser-level side effects.
--
-- REVOKE EXECUTE closes the REST API exposure. Database triggers
-- are not subject to role EXECUTE permissions, so the trigger
-- itself continues to fire normally on auth.users inserts.
--
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;


-- ── Verify ───────────────────────────────────────────────────
-- After running, go to: Database → Linter → Re-run
-- The following warnings should be gone:
--   public_bucket_allows_listing
--   anon_security_definer_function_executable
--   authenticated_security_definer_function_executable
--
-- For the leaked password warning, toggle it on in:
--   Auth → Sign In / Up → Password → Enable leaked password protection
-- ============================================================
