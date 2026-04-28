export const dynamic = "force-dynamic";
/**
 * POST /api/staff/invite/accept
 *
 * Called when a staff member submits the accept-invite form.
 * 1. Validates the token (not expired, not already used)
 * 2. Creates a Supabase Auth user (staff member's account)
 * 3. Creates Profile row with role = "staff"
 * 4. Creates StaffEventAssignment rows for each assigned event
 * 5. Creates OrgMember row scoped to staff role
 * 6. Marks StaffInvite as accepted
 * 7. Returns success so the client can redirect to /auth/login
 *
 * Note: We use the Admin API to create the user (bypasses email confirmation
 * for staff accounts — they were explicitly invited by an organiser).
 * SUPABASE_SERVICE_ROLE_KEY is required for this route to function.
 */

import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? "";

const AcceptSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name:     z.string().min(1).max(100).trim(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { token, password, name } = parsed.data;

  if (!SUPABASE_SERVICE || !SUPABASE_URL) {
    return NextResponse.json(
      { error: "Auth service not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local" },
      { status: 503 }
    );
  }

  try {
    // ── 1. Validate token ─────────────────────────────────────────────
    const invite = await (prisma as any).staffInvite.findUnique({
      where: { token },
      include: {
        eventAssignments: { select: { eventId: true } },
        org:              { select: { id: true, name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
    }
    if (invite.status === "accepted") {
      return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
    }
    if (new Date() > new Date(invite.expiresAt)) {
      await (prisma as any).staffInvite.update({
        where: { id: invite.id },
        data:  { status: "expired" },
      }).catch(() => {});
      return NextResponse.json({ error: "This invite link has expired. Ask your organiser to resend it." }, { status: 410 });
    }

    // ── 2. Create Supabase Auth user via Admin API ─────────────────────
    const createUserRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users`,
      {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey":        SUPABASE_SERVICE,
          "Authorization": `Bearer ${SUPABASE_SERVICE}`,
        },
        body: JSON.stringify({
          email:              invite.email,
          password,
          email_confirm:      true, // skip confirmation — they were invited
          user_metadata: {
            full_name: name,
            name,
            role:      "staff",
            org_id:    invite.orgId,
            org_name:  invite.org.name,
          },
        }),
      }
    );

    if (!createUserRes.ok) {
      const errBody = await createUserRes.json().catch(() => ({}));
      const msg     = (errBody as any).message ?? "Failed to create account.";
      if (msg.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Ask your organiser to resend the invite to a different email." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const newUser      = await createUserRes.json();
    const staffUserId: string = newUser.id;

    // ── 3. Create Profile row ─────────────────────────────────────────
    await (prisma as any).profile.upsert({
      where:  { supabaseUserId: staffUserId },
      update: { role: "staff", fullName: name, orgId: invite.orgId, updatedAt: new Date() },
      create: { supabaseUserId: staffUserId, role: "staff", fullName: name, orgId: invite.orgId },
    });

    // ── 4. Create StaffEventAssignment rows ───────────────────────────
    const eventIds: string[] = invite.eventAssignments.map((e: any) => e.eventId);
    await (prisma as any).staffEventAssignment.createMany({
      data:           eventIds.map((eventId: string) => ({
        supabaseUserId: staffUserId,
        eventId,
        orgId: invite.orgId,
      })),
      skipDuplicates: true,
    });

    // ── 5. Create OrgMember row ────────────────────────────────────────
    await (prisma as any).orgMember.upsert({
      where:  { supabaseUserId_orgId: { supabaseUserId: staffUserId, orgId: invite.orgId } },
      update: { role: "staff" },
      create: { supabaseUserId: staffUserId, orgId: invite.orgId, role: "staff" },
    });

    // ── 6. Mark invite as accepted ────────────────────────────────────
    await (prisma as any).staffInvite.update({
      where: { id: invite.id },
      data:  { status: "accepted", acceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      email:   invite.email,
      message: "Account created. You can now sign in.",
    });

  } catch (err: any) {
    console.error("[POST /api/staff/invite/accept]", err);
    return NextResponse.json({ error: "Account creation failed. Please try again." }, { status: 500 });
  }
}
