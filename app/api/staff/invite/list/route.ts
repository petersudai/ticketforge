export const dynamic = "force-dynamic";

/**
 * GET /api/staff/invite/list
 *
 * Returns pending (unaccepted, unexpired) staff invites for the caller's org.
 *
 * Why a separate endpoint from /api/staff/invite (which takes ?token=)?
 *   • /api/staff/invite?token=xxx validates a single token — used by the
 *     accept-invite page when a staff member arrives via the email link.
 *     It returns minimal data (validity + org name) for a public visitor.
 *   • /api/staff/invite/list returns the organiser's full pending-invite
 *     list — used by the /team management page. Requires auth + org scope.
 *
 *   Separating them keeps the public single-token validator small and avoids
 *   accidentally leaking the list to non-org members.
 *
 * Auth:
 *   • organiser   → sees their org's pending invites
 *   • super_admin → sees their org's pending invites (same as organiser)
 *
 * Behaviour:
 *   • Invites past their expiresAt are flipped to status="expired" on read
 *     (lightweight self-healing) and excluded from the response.
 *   • Already-accepted invites are excluded — once accepted, the user appears
 *     in the team-members list instead.
 *
 * Response shape (each item):
 *   {
 *     id:         StaffInvite.id
 *     name:       invitee's name
 *     email:      invitee's email
 *     expiresAt:  ISO string
 *     createdAt:  ISO string
 *     eventCount: number of events this invite grants access to
 *     events:     [{ id, name }] — names included so the UI can show what
 *                 the invitee will be assigned to
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const orgId = guard.orgId;
  if (!orgId) {
    return NextResponse.json([]);
  }

  try {
    // 1. Pull all non-accepted invites for this org with their assignment
    //    rows. Note: StaffInviteEvent has eventId (foreign key) but NO
    //    Prisma relation back to Event in the schema, so we can only
    //    select scalar columns here. Event names are joined in step 3.
    const invites = await (prisma as any).staffInvite.findMany({
      where: {
        orgId,
        status: { in: ["pending"] }, // not accepted, not already marked expired
      },
      include: {
        eventAssignments: {
          select: { eventId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now            = new Date();
    const expiredIds:  string[] = [];
    const stillPending: any[]   = [];

    for (const inv of invites) {
      if (new Date(inv.expiresAt) <= now) {
        expiredIds.push(inv.id);
      } else {
        stillPending.push(inv);
      }
    }

    // 2. Self-heal: mark expired invites as "expired" so they stop showing up
    //    in future reads. Best-effort; failures are non-fatal because the
    //    next read will retry.
    if (expiredIds.length > 0) {
      await (prisma as any).staffInvite.updateMany({
        where: { id: { in: expiredIds } },
        data:  { status: "expired" },
      }).catch((err: any) => {
        console.warn("[GET /api/staff/invite/list] failed to mark expired invites", err);
      });
    }

    // 3. Collect every eventId across all still-pending invites, fetch the
    //    event names in ONE batched query, then build a Map for O(1) lookup
    //    when shaping the response. This is faster and simpler than adding
    //    a relation to the Prisma schema right now.
    const allEventIds = Array.from(new Set(
      stillPending.flatMap((inv: any) =>
        (inv.eventAssignments ?? []).map((ea: any) => ea.eventId)
      )
    ));

    let eventById = new Map<string, { id: string; name: string }>();
    if (allEventIds.length > 0) {
      const events = await (prisma as any).event.findMany({
        where:  { id: { in: allEventIds } },
        select: { id: true, name: true },
      });
      eventById = new Map(events.map((e: any) => [e.id, e]));
    }

    // 4. Shape the response. Events whose IDs no longer exist in the Event
    //    table (deleted between invite send and now) are silently dropped
    //    from the events array — the eventCount reflects the remaining
    //    valid ones so the UI never shows a phantom assignment.
    const shaped = stillPending.map((inv: any) => {
      const events = (inv.eventAssignments ?? [])
        .map((ea: any) => eventById.get(ea.eventId))
        .filter(Boolean) as { id: string; name: string }[];

      return {
        id:         inv.id,
        name:       inv.name,
        email:      inv.email,
        expiresAt:  inv.expiresAt.toISOString(),
        createdAt:  inv.createdAt.toISOString(),
        eventCount: events.length,
        events,
      };
    });

    return NextResponse.json(shaped);
  } catch (err) {
    console.error("[GET /api/staff/invite/list]", err);
    return NextResponse.json(
      { error: "Failed to load pending invites" },
      { status: 500 }
    );
  }
}
