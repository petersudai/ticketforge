export const dynamic = "force-dynamic";
/**
 * POST /api/attendees/[id]/undo-checkin
 *
 * Organiser-only: undo the most recent check-in for an attendee.
 * This:
 *   1. Finds the latest non-undone Scan row with result "valid" or "override"
 *   2. Decrements checkInCount by 1 (atomically)
 *   3. Marks checkedIn = false if checkInCount drops below tier.capacity
 *   4. Marks the Scan row as undone with timestamp, who, and reason
 *
 * Auth: requireOrganiser — scanners cannot undo; only org owners/admins.
 * Ownership: event must belong to the organiser's org.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganiser, assertEventOwnership } from "@/lib/api-auth";
import { z } from "zod";

const BodySchema = z.object({
  reason: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const { id: attendeeId } = await params;

  let body: unknown;
  try { body = await req.json(); }
  catch { body = {}; }

  const parsed = BodySchema.safeParse(body);
  const reason = parsed.success ? (parsed.data.reason ?? null) : null;

  try {
    const result = await db.$transaction(async (tx) => {
      // Lock the attendee row
      const rows = await tx.$queryRaw<any[]>`
        SELECT a.*,
               t.capacity AS "tierCapacity"
        FROM   "Attendee" a
        LEFT JOIN "Tier" t ON t.id = a."tierId"
        WHERE  a.id = ${attendeeId}
        LIMIT  1
        FOR UPDATE OF a
      `;

      if (!rows.length) {
        return { ok: false, status: 404, error: "Attendee not found" };
      }

      const att = rows[0];
      const capacity: number = att.tierCapacity ?? 1;
      const checkInCount: number = att.checkInCount ?? 0;

      if (checkInCount <= 0) {
        return { ok: false, status: 409, error: "Attendee has not been checked in" };
      }

      // Verify organiser owns the event this attendee belongs to
      const own = await assertEventOwnership(att.eventId, guard);
      if (!own.ok) {
        return { ok: false, status: 403, error: "Not authorised for this event" };
      }

      // Find the most recent valid, non-undone Scan row
      const scanToUndo = await tx.scan.findFirst({
        where: {
          attendeeId,
          result:    { in: ["valid", "override"] },
          undoneAt:  null,
        },
        orderBy: { scannedAt: "desc" },
      });

      if (!scanToUndo) {
        return { ok: false, status: 409, error: "No undoable scan found" };
      }

      const newCount  = checkInCount - 1;
      const now       = new Date();
      const undoneBy  = guard.user.id;

      // Decrement counter; reopen ticket if it was fully redeemed
      await tx.attendee.update({
        where: { id: attendeeId },
        data: {
          checkInCount: newCount,
          checkedIn:    newCount >= capacity ? true : false,
          // Clear checkedInAt if rolled back to zero
          ...(newCount === 0 ? { checkedInAt: null, lastCheckInAt: null } : {}),
        },
      });

      // Mark the scan as undone
      await tx.scan.update({
        where: { id: scanToUndo.id },
        data: {
          undoneAt:     now,
          undoneBy,
          undoneReason: reason,
        },
      });

      // Write a fresh "undone" audit row so the log is append-only
      await tx.scan.create({
        data: {
          ticketId:   att.ticketId,
          eventId:    att.eventId,
          attendeeId,
          result:     "undone",
          scannerId:  undoneBy,
          entryNumber: scanToUndo.entryNumber,
        },
      });

      return {
        ok: true,
        checkInCount: newCount,
        capacity,
        checkedIn: newCount >= capacity,
        undoneEntry: scanToUndo.entryNumber,
      };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: (result as any).error },
        { status: (result as any).status },
      );
    }

    console.log("[undo-checkin]", {
      attendeeId,
      undoneBy: guard.user.id,
      checkInCount: result.checkInCount,
      reason,
    });

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("[POST /api/attendees/[id]/undo-checkin]", { attendeeId, err: err.message });
    return NextResponse.json({ error: "Undo failed — please try again" }, { status: 500 });
  }
}
