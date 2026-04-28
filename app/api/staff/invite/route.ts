export const dynamic = "force-dynamic";
/**
 * POST /api/staff/invite  — Create a staff invite and send email via Resend
 * GET  /api/staff/invite?token=xxx — Validate a token (for the accept page)
 *
 * Organiser sends: { name, email, eventIds[], orgId }
 * System creates StaffInvite + StaffInviteEvent rows, sends invite email.
 * Token is a 32-byte hex string. Expires in 48 hours.
 *
 * Security: orgId from the request body is verified against the caller's
 * actual OrgMember record — the client cannot spoof a different org.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db as prisma } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";
import { sendStaffInviteEmail } from "@/lib/resend";
import { z } from "zod";

const InviteSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  email:    z.string().email(),
  eventIds: z.array(z.string().min(1)).min(1, "Select at least one event"),
  orgId:    z.string().min(1),
});

// ── POST — create invite ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { name, email, eventIds, orgId } = parsed.data;

  // Verify the caller is actually a member of the claimed org.
  // super_admin bypasses this check.
  if (guard.role !== "super_admin" && guard.orgId !== orgId) {
    return NextResponse.json(
      { error: "Forbidden — you are not a member of this organisation" },
      { status: 403 }
    );
  }

  try {
    // Check for existing pending invite to same email + org
    const existing = await (prisma as any).staffInvite.findFirst({
      where: { email, orgId, status: "pending" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A pending invite already exists for this email." },
        { status: 409 }
      );
    }

    const token     = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    // Fetch org name and event names for the email
    const [org, events] = await Promise.all([
      (prisma as any).organisation.findUnique({
        where: { id: orgId },
        select: { name: true },
      }),
      (prisma as any).event.findMany({
        where: { id: { in: eventIds } },
        select: { name: true },
      }),
    ]);

    if (!org) {
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    const invite = await (prisma as any).staffInvite.create({
      data: {
        token,
        email,
        name,
        orgId,
        invitedBy:  guard.user.id,
        status:     "pending",
        expiresAt,
        eventAssignments: {
          create: eventIds.map((eventId: string) => ({ eventId })),
        },
      },
    });

    // Send invite email via Resend
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/auth/invite/${token}`;

    const emailResult = await sendStaffInviteEmail({
      toEmail:    email,
      toName:     name,
      orgName:    org.name,
      eventNames: events.map((e: any) => e.name),
      inviteUrl,
      expiresIn:  "48 hours",
    });

    if (!emailResult.ok) {
      console.warn("[staff/invite] Email send failed (non-fatal):", emailResult.error);
    }

    return NextResponse.json({
      inviteId:  invite.id,
      email,
      expiresAt,
      inviteUrl, // returned so organiser can copy/share manually if email fails
      message:   `Invite sent to ${email}`,
    });

  } catch (err: any) {
    console.error("[POST /api/staff/invite]", err);
    return NextResponse.json({ error: "Failed to create invite." }, { status: 500 });
  }
}

// ── GET — validate token ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const invite = await (prisma as any).staffInvite.findUnique({
    where: { token },
    include: {
      org:              { select: { name: true, slug: true } },
      eventAssignments: { select: { eventId: true } },
    },
  }).catch(() => null);

  if (!invite) {
    return NextResponse.json({ valid: false, error: "Invalid invite link." }, { status: 404 });
  }

  if (invite.status === "accepted") {
    return NextResponse.json({ valid: false, error: "This invite has already been accepted." }, { status: 410 });
  }

  if (new Date() > new Date(invite.expiresAt)) {
    await (prisma as any).staffInvite.update({
      where: { id: invite.id },
      data:  { status: "expired" },
    }).catch(() => {});
    return NextResponse.json({ valid: false, error: "This invite link has expired." }, { status: 410 });
  }

  return NextResponse.json({
    valid:   true,
    name:    invite.name,
    email:   invite.email,
    orgName: invite.org.name,
    orgSlug: invite.org.slug,
  });
}
