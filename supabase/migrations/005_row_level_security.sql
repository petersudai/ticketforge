-- ══════════════════════════════════════════════════════════════════════
-- 005_row_level_security.sql
-- Run in Supabase dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════
-- Adds Row Level Security (RLS) to enforce event ownership at the
-- database layer. This is a defence-in-depth measure — the API already
-- scopes queries to the caller's orgId, but RLS ensures that even a
-- compromised or buggy query cannot leak another org's data.
--
-- Policy:
--   - Organisers can only SELECT/UPDATE/DELETE their own org's events
--   - The service_role key (used by the API) bypasses RLS for writes
--   - Direct Supabase client calls from the browser are blocked by default
--   - Super admin has unrestricted access (managed via service_role)
--
-- NOTE: Prisma uses the service_role key (via DATABASE_URL), which
-- bypasses RLS. RLS only applies to anon/authenticated Supabase JS
-- client calls. This is the intended behaviour — all reads/writes go
-- through the API which enforces ownership in application code.
-- ══════════════════════════════════════════════════════════════════════

-- ── Enable RLS on the Event table ─────────────────────────────────────
ALTER TABLE public."Event" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "events_org_isolation" ON public."Event";
DROP POLICY IF EXISTS "events_service_role_bypass" ON public."Event";

-- Policy: authenticated users can only see events from their own org
-- This applies to direct Supabase JS client queries (not Prisma/service_role)
CREATE POLICY "events_org_isolation" ON public."Event"
  FOR ALL
  USING (
    -- Allow service role full access (bypasses this check automatically)
    -- Allow if the calling user is a member of this event's org
    "orgId" IN (
      SELECT "orgId"
      FROM   public."OrgMember"
      WHERE  "supabaseUserId" = auth.uid()::text
    )
  );

-- ── Enable RLS on Tier table ──────────────────────────────────────────
ALTER TABLE public."Tier" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tiers_org_isolation" ON public."Tier";

CREATE POLICY "tiers_org_isolation" ON public."Tier"
  FOR ALL
  USING (
    "eventId" IN (
      SELECT e.id
      FROM   public."Event" e
      JOIN   public."OrgMember" m ON m."orgId" = e."orgId"
      WHERE  m."supabaseUserId" = auth.uid()::text
    )
  );

-- ── Enable RLS on Attendee table ──────────────────────────────────────
ALTER TABLE public."Attendee" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendees_org_isolation" ON public."Attendee";

CREATE POLICY "attendees_org_isolation" ON public."Attendee"
  FOR ALL
  USING (
    "eventId" IN (
      SELECT e.id
      FROM   public."Event" e
      JOIN   public."OrgMember" m ON m."orgId" = e."orgId"
      WHERE  m."supabaseUserId" = auth.uid()::text
    )
  );

-- ── OrgMember: users can only see their own memberships ───────────────
ALTER TABLE public."OrgMember" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orgmember_self_only" ON public."OrgMember";

CREATE POLICY "orgmember_self_only" ON public."OrgMember"
  FOR SELECT
  USING ("supabaseUserId" = auth.uid()::text);

-- ── Profile: users can only see/update their own profile ─────────────
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_self_only" ON public."Profile";

CREATE POLICY "profile_self_only" ON public."Profile"
  FOR ALL
  USING ("supabaseUserId" = auth.uid()::text);

-- ── Verification ──────────────────────────────────────────────────────
-- Run this to confirm RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM   pg_tables
-- WHERE  schemaname = 'public'
-- AND    tablename IN ('Event','Tier','Attendee','OrgMember','Profile');
