export const dynamic = "force-dynamic";
/**
 * PATCH  /api/attendees/[id] — update an attendee (event owner only)
 * DELETE /api/attendees/[id] — remove an attendee (event owner only)
 *
 * Previously had NO auth or ownership check — any authenticated user could
 * mutate or delete any attendee by guessing their UUID. Now enforced.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrganiser, assertEventOwnership } from "@/lib/api-auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const AllowedUpdates = z.object({
  name:        z.string().min(1).max(120).optional(),
  email:       z.string().email().optional(),
  phone:       z.string().optional(),
  seat:        z.string().optional(),
  payStatus:   z.enum(["paid", "free", "pending"]).optional(),
  pricePaid:   z.number().min(0).optional(),
  // NOTE: setting checkedIn directly bypasses the multi-use checkInCount counter.
  // Use POST /api/scan for normal check-ins and POST /api/attendees/[id]/undo-checkin to undo.
  // This direct override is allowed only for organiser manual corrections.
  checkedIn:   z.boolean().optional(),
  checkedInAt: z.string().optional(),
  emailSent:   z.boolean().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  // Fetch the attendee to get its eventId for ownership check
  const existing = await (prisma as any).attendee.findUnique({
    where:  { id },
    select: { eventId: true },
  }).catch(() => null);

  if (!existing) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  const own = await assertEventOwnership(existing.eventId, guard);
  if (!own.ok) return own.response;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = AllowedUpdates.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid field in update" },
      { status: 422 }
    );
  }

  try {
    const attendee = await (prisma as any).attendee.update({
      where: { id },
      data:  parsed.data,
    });
    return NextResponse.json(attendee);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }
    console.error("[PATCH /api/attendees/[id]]", { id, err: err.message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const existing = await (prisma as any).attendee.findUnique({
    where:  { id },
    select: { eventId: true },
  }).catch(() => null);

  if (!existing) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  const own = await assertEventOwnership(existing.eventId, guard);
  if (!own.ok) return own.response;

  try {
    await (prisma as any).attendee.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }
    console.error("[DELETE /api/attendees/[id]]", { id, err: err.message });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
