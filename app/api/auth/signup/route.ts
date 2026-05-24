export const dynamic = "force-dynamic";
/**
 * POST /api/auth/signup
 *
 * Called after Supabase signup to create Organisation + OrgMember + Profile.
 *
 * SECURITY: SUPABASE_SERVICE_ROLE_KEY is required. Without it we cannot
 * verify the caller owns the supabaseUserId they supply, opening an
 * org-hijacking vector. Return 503 instead of degrading insecurely.
 *
 * Why not cookie auth? The session cookie does not exist yet at the moment
 * this is called — the signup page calls it immediately after signUp()
 * returns, before the browser has received the Set-Cookie response.
 * The Admin API verify step is the only safe alternative.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureOrgForUser } from "@/lib/orgs/ensureOrgForUser";
import { z } from "zod";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const SignupSchema = z.object({
  supabaseUserId: z.string().min(1),
  orgName:        z.string().min(1).max(120).trim(),
});

export async function POST(req: NextRequest) {
  // Refuse to operate without the service key — we cannot verify callers safely.
  if (!SUPABASE_SERVICE || !SUPABASE_URL) {
    console.error("[/api/auth/signup] SUPABASE_SERVICE_ROLE_KEY is not set — refusing signup");
    return NextResponse.json(
      { error: "Server misconfiguration. Contact support." },
      { status: 503 }
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { supabaseUserId, orgName } = parsed.data;

  // ── Verify the caller owns this supabaseUserId via Admin API ──────
  const verifyRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${supabaseUserId}`,
    {
      headers: {
        "apikey":        SUPABASE_SERVICE,
        "Authorization": `Bearer ${SUPABASE_SERVICE}`,
      },
    }
  );
  if (!verifyRes.ok) {
    console.error("[/api/auth/signup] User not found in Supabase Auth:", supabaseUserId);
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  try {
    // ── Single call: idempotent, race-safe org provisioning ──────────
    // The helper handles all four cases:
    //   (a) user already has an org → returns existing
    //   (b) fresh user → creates org + member + syncs Profile
    //   (c) slug clash with unrelated org → retries with new suffix
    //   (d) parallel request beat us → catches P2002, refetches
    const result = await ensureOrgForUser({
      supabaseUserId,
      orgName,
      userMetadata: null, // explicit orgName always wins on this route
      userEmail:    null,
    });

    // ── Sync role to Supabase JWT metadata (fire-and-forget) ─────────
    // Only fired for newly-created orgs — for "existing" results, the
    // metadata is presumably already correct from the original setup.
    if (!result.existing && SUPABASE_SERVICE && SUPABASE_URL) {
      fetch(`${SUPABASE_URL}/auth/v1/admin/users/${supabaseUserId}`, {
        method:  "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey":        SUPABASE_SERVICE,
          "Authorization": `Bearer ${SUPABASE_SERVICE}`,
        },
        body: JSON.stringify({
          user_metadata: { role: "organiser", org_name: orgName },
        }),
      }).catch(err => {
        console.warn("[/api/auth/signup] Metadata sync failed (non-fatal):", err.message);
      });
    }

    return NextResponse.json({
      orgId:    result.orgId,
      name:     result.orgName,
      slug:     result.orgSlug,
      existing: result.existing,
    });

  } catch (err: any) {
    // Log with full detail so we can diagnose any future schema mismatches
    console.error("[/api/auth/signup] org creation failed:", {
      message: err.message,
      code:    err.code,
      meta:    err.meta,
      name:    err.constructor?.name,
    });
    return NextResponse.json({ error: "Setup failed. Please try again." }, { status: 500 });
  }
}
