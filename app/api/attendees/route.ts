export const dynamic = "force-dynamic";
/**
 * GET  /api/attendees?eventId=xxx — List attendees for one event (scoped to caller's org)
 * POST /api/attendees             — Create attendee manually (organiser only)
 *
 * SECURITY: Both verbs require organiser auth. GET enforces org scoping
 * by joining through Event.orgId. No attendee from another org is ever returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganiser, assertEventOwnership } from "@/lib/api-auth";
import { z } from "zod";
import { genTicketId } from "@/lib/utils";

const CreateAttendeeSchema = z.object({
  eventId:   z.string().min(1),
  tierId:    z.string().optional().nullable(),
  name:      z.string().min(1).max(120).trim(),
  email:     z.string().email().optional().nullable(),
  phone:     z.string().optional().nullable(),
  seat:      z.string().optional().nullable(),
  payStatus: z.enum(["paid", "free", "pending"]).default("paid"),
  pricePaid: z.number().min(0).default(0),
  source:    z.string().default("manual"),
});

export async function GET(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  try {
    // Always scope to caller's org — never return cross-org attendees
    const where: any = guard.role === "super_admin"
      ? {}
      : { event: { orgId: guard.orgId } };

    if (eventId) {
      where.eventId = eventId;
    }

    const attendees = await db.attendee.findMany({
      where,
      include: { tier: { select: { name: true, capacity: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attendees);
  } catch (err) {
    console.error("[GET /api/attendees]", err);
    return NextResponse.json({ error: "Failed to fetch attendees" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateAttendeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { eventId } = parsed.data;

  // Ownership check — event must belong to caller's org
  const ownership = await assertEventOwnership(eventId, guard);
  if (!ownership.ok) return ownership.response;

  try {
    const attendee = await db.attendee.create({
      data: {
        ...parsed.data,
        ticketId: genTicketId(),
      },
    });
    return NextResponse.json(attendee, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/attendees]", err);
    return NextResponse.json({ error: "Failed to create attendee" }, { status: 500 });
  }
}
