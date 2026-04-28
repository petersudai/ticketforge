export const dynamic = "force-dynamic";
/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's role and orgId from the DB.
 * Used as a fallback by AuthProvider when user_metadata.role is missing —
 * this happens for accounts created before the DB trigger populated metadata.
 *
 * On success, opportunistically syncs the role back into Supabase
 * user_metadata so the JWT is correct for all future requests and
 * this DB call is no longer needed.
 *
 * Response: { role: string, orgId: string | null, userId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "";
const SUPABASE_ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? "";

export async function GET(req: NextRequest) {
  // Require Supabase to be configured
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  // Validate session from cookies
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up Profile in DB
  const profile = await db.profile.findUnique({
    where:  { supabaseUserId: user.id },
    select: { role: true, orgId: true },
  }).catch(() => null);

  // Look up primary org membership if profile doesn't have orgId
  let orgId = profile?.orgId ?? null;
  if (!orgId) {
    const member = await db.orgMember.findFirst({
      where:   { supabaseUserId: user.id },
      select:  { orgId: true },
      orderBy: { org: { createdAt: "asc" } },
    }).catch(() => null);
    orgId = member?.orgId ?? null;
  }

  const role = profile?.role ?? "organiser";

  // Opportunistically sync role into JWT metadata so this fallback is
  // not needed on the next login. Fire-and-forget — non-critical.
  if (SUPABASE_SERVICE && !user.user_metadata?.role) {
    fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey":        SUPABASE_SERVICE,
        "Authorization": `Bearer ${SUPABASE_SERVICE}`,
      },
      body: JSON.stringify({
        user_metadata: { ...user.user_metadata, role },
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ role, orgId, userId: user.id });
}
