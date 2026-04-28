export const dynamic = "force-dynamic";
/**
 * POST /api/scan — scan a ticket at the gate
 * GET  /api/scan?eventId=xxx — fetch scan history for an event
 *
 * Auth: requireScanner (super_admin, organiser, staff)
 * Ownership: staff may only scan events they are assigned to.
 *            organisers may scan their own events.
 *
 * Previously had NO auth — any request could check in any attendee.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanner, assertEventOwnership } from "@/lib/api-auth";
import { z } from "zod";

const ScanBodySchema = z.object({
  ticketId: z.string().min(1),
  eventId:  z.string().min(1),
  override: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const guard = await requireScanner(req);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = ScanBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { ticketId, eventId, override } = parsed.data;

  // Ownership: verify the scanner has access to this event
  // For staff, this checks their event-specific assignment via OrgMember.
  const own = await assertEventOwnership(eventId, guard);
  if (!own.ok) return own.response;

  const attendee = await (prisma as any).attendee.findFirst({
    where:   { ticketId, eventId },
    include: { tier: true },
  }).catch(() => null);

  if (!attendee) {
    console.log("[scan] invalid", { ticketId, eventId, userId: guard.user.id });
    await (prisma as any).scan.create({
      data: { ticketId, eventId, result: "invalid" },
    }).catch(() => {});
    return NextResponse.json({ result: "invalid", message: `Ticket ${ticketId} not found for this event` });
  }

  if (attendee.checkedIn && !override) {
    console.log("[scan] duplicate", { ticketId, eventId, attendeeId: attendee.id });
    await (prisma as any).scan.create({
      data: { ticketId, eventId, attendeeId: attendee.id, result: "duplicate" },
    }).catch(() => {});
    return NextResponse.json({
      result:   "duplicate",
      message:  "Already checked in",
      attendee: { name: attendee.name, tier: attendee.tier?.name, capacity: attendee.tier?.capacity ?? 1 },
    });
  }

  await (prisma as any).attendee.update({
    where: { id: attendee.id },
    data:  { checkedIn: true, checkedInAt: new Date() },
  });

  await (prisma as any).scan.create({
    data: {
      ticketId,
      eventId,
      attendeeId: attendee.id,
      result:     override ? "override" : "valid",
    },
  }).catch(() => {});

  console.log("[scan] success", {
    result: override ? "override" : "valid",
    ticketId, eventId, attendeeId: attendee.id, userId: guard.user.id,
  });

  return NextResponse.json({
    result:   override ? "override" : "valid",
    message:  override ? "Override check-in approved" : "Welcome!",
    attendee: { name: attendee.name, tier: attendee.tier?.name, seat: attendee.seat, capacity: attendee.tier?.capacity ?? 1 },
  });
}

export async function GET(req: NextRequest) {
  const guard = await requireScanner(req);
  if (guard.error) return guard.error;

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId query param required" }, { status: 400 });
  }

  // Ownership check for reading scan logs
  const own = await assertEventOwnership(eventId, guard);
  if (!own.ok) return own.response;

  try {
    const scans = await (prisma as any).scan.findMany({
      where:   { eventId },
      include: { attendee: { include: { tier: true } } },
      orderBy: { scannedAt: "desc" },
      take:    200,
    });
    return NextResponse.json(scans);
  } catch (err: any) {
    console.error("[GET /api/scan]", { eventId, err: err.message });
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
}
