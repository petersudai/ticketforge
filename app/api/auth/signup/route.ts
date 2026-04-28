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
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
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
    // ── Idempotency: return existing org if already set up ────────────
    const existingMember = await db.orgMember.findFirst({
      where:   { supabaseUserId },
      include: { org: true },
    }).catch(() => null);

    if (existingMember?.org) {
      console.log("[/api/auth/signup] existing org found", {
        userId: supabaseUserId,
        orgId:  existingMember.orgId,
      });
      return NextResponse.json({
        orgId:    existingMember.orgId,
        name:     existingMember.org.name,
        slug:     existingMember.org.slug,
        existing: true,
      });
    }

    // ── Generate unique slug ──────────────────────────────────────────
    const baseSlug = slugify(orgName) || "my-org";
    const existing = await db.organisation.findUnique({ where: { slug: baseSlug } }).catch(() => null);
    const finalSlug = existing
      ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      : baseSlug;

    // ── Create Organisation + OrgMember atomically ────────────────────
    const org = await db.organisation.create({
      data: {
        name:          orgName,
        slug:          finalSlug,
        plan:          "starter",
        payoutVerified: false,
        kycStatus:     "none",
        members: {
          create: { supabaseUserId, role: "owner" },
        },
      },
    });

    console.log("[/api/auth/signup] org created", {
      userId: supabaseUserId,
      orgId:  org.id,
      name:   org.name,
    });

    // ── Upsert Profile with orgId ─────────────────────────────────────
    await db.profile.upsert({
      where:  { supabaseUserId },
      update: { role: "organiser", orgId: org.id },
      create: { supabaseUserId, role: "organiser", orgId: org.id },
    });

    // ── Sync role to Supabase JWT metadata (fire-and-forget) ─────────
    if (SUPABASE_SERVICE && SUPABASE_URL) {
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

    return NextResponse.json({ orgId: org.id, name: org.name, slug: org.slug });

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
