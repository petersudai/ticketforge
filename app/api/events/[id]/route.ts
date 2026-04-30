export const dynamic = "force-dynamic";
/**
 * GET    /api/events/[id]
 * PATCH  /api/events/[id]
 * DELETE /api/events/[id]
 *
 * Ownership enforced via assertEventOwnership on every verb.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganiser, assertEventOwnership } from "@/lib/api-auth";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const PatchEventSchema = z.object({
  name:        z.string().min(1).max(200).trim().optional(),
  date:        z.string().optional(),
  time:        z.string().nullable().optional(),
  endTime:     z.string().max(20).nullable().optional(),
  endDate:     z.string().nullable().optional(),
  venue:       z.string().nullable().optional(),
  organizer:   z.string().nullable().optional(),
  category:    z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  capacity:    z.number().int().positive().nullable().optional(),
  currency:    z.string().optional(),
  accent:      z.string().optional(),
  bgImage:     z.string().nullable().optional(),
  mpesaSc:     z.string().nullable().optional(),
  published:   z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const ownership = await assertEventOwnership(id, guard);
  if (!ownership.ok) return ownership.response;

  try {
    const event = await db.event.findUnique({
      where:   { id },
      include: {
        tiers:     { orderBy: { sortOrder: "asc" } },
        attendees: {
          include: { tier: true, scans: { orderBy: { scannedAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(event);
  } catch (err) {
    console.error("[GET /api/events/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const ownership = await assertEventOwnership(id, guard);
  if (!ownership.ok) return ownership.response;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PatchEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  try {
    const event = await db.event.update({
      where:   { id },
      data:    parsed.data,
      include: { tiers: { orderBy: { sortOrder: "asc" } }, attendees: true },
    });
    return NextResponse.json(event);
  } catch (err: any) {
    if (err?.code === "P2025") return NextResponse.json({ error: "Event not found" }, { status: 404 });
    console.error("[PATCH /api/events/[id]]", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const ownership = await assertEventOwnership(id, guard);
  if (!ownership.ok) return ownership.response;

  try {
    await db.event.delete({ where: { id } });
    console.log("[DELETE /api/events/[id]]", { eventId: id, userId: guard.user.id });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    if (err?.code === "P2025") return NextResponse.json({ error: "Event not found" }, { status: 404 });
    console.error("[DELETE /api/events/[id]]", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
