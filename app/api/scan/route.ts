export const dynamic = "force-dynamic";
/**
 * POST /api/scan — scan a ticket at the gate
 * GET  /api/scan?eventId=xxx — fetch scan history for an event
 *
 * Auth: requireScanner (super_admin, organiser, staff)
 * Ownership: staff may only scan events they are assigned to.
 *            organisers may scan their own events.
 *
 * Multi-use group ticket logic:
 *   - Each ticket may be scanned up to tier.capacity times
 *   - checkInCount tracks fast counter; Scan rows are full audit trail
 *   - checkedIn = true only when checkInCount >= tier.capacity (fully redeemed)
 *   - 6-second server-side cooldown prevents double-scan from same physical scanner
 *   - Override flag (PIN-gated client-side) allows +1 beyond capacity with full logging
 *   - Atomic DB transaction with SELECT FOR UPDATE prevents race conditions
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireScanner, assertEventOwnership } from "@/lib/api-auth";
import { z } from "zod";

const COOLDOWN_MS = 6_000; // 6 seconds server-side double-scan protection

const ScanBodySchema = z.object({
  ticketId: z.string().min(1),
  eventId:  z.string().min(1),
  override: z.boolean().default(false),
  overridePin: z.string().optional(), // already validated client-side; logged here
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
      { status: 422 },
    );
  }

  const { ticketId, eventId, override } = parsed.data;
  const scannerId = guard.user.id;

  // Ownership: verify the scanner has access to this event
  const own = await assertEventOwnership(eventId, guard);
  if (!own.ok) return own.response;

  // ── Atomic transaction with row-level lock ──────────────────────────
  // We use $transaction + raw SQL for SELECT FOR UPDATE to prevent two
  // concurrent scans of the same ticket both succeeding.
  try {
    const result = await db.$transaction(async (tx) => {
      // Lock the attendee row for the duration of this transaction
      const rows = await tx.$queryRaw<any[]>`
        SELECT a.*,
               t.capacity AS "tierCapacity",
               t.name     AS "tierName"
        FROM   "Attendee" a
        LEFT JOIN "Tier" t ON t.id = a."tierId"
        WHERE  a."ticketId" = ${ticketId}
          AND  a."eventId"  = ${eventId}
        LIMIT  1
        FOR UPDATE OF a
      `;

      // ── Ticket not found ────────────────────────────────────────────
      if (!rows.length) {
        await tx.scan.create({
          data: { ticketId, eventId, result: "invalid", scannerId },
        });
        return {
          result:  "invalid",
          message: `Ticket ${ticketId} not found for this event`,
        };
      }

      const att = rows[0];
      // maxCheckIns overrides tier.capacity for individually-expanded tickets (new architecture).
      // Null on legacy records → fall back to tier.capacity (backward compat).
      const capacity: number = att.maxCheckIns ?? att.tierCapacity ?? 1;
      const checkInCount: number = att.checkInCount ?? 0;

      // ── Server-side cooldown (6 seconds) ───────────────────────────
      if (att.lastCheckInAt) {
        const msSinceLast = Date.now() - new Date(att.lastCheckInAt).getTime();
        if (msSinceLast < COOLDOWN_MS) {
          await tx.scan.create({
            data: { ticketId, eventId, attendeeId: att.id, result: "cooldown", scannerId },
          });
          return {
            result:         "cooldown",
            message:        `Ticket scanned ${Math.round(msSinceLast / 1000)}s ago — please wait`,
            attendee:       { name: att.name },
            entryNumber:    checkInCount,
            totalAllowed:   capacity,
            remaining:      Math.max(0, capacity - checkInCount),
          };
        }
      }

      // ── Already fully redeemed ─────────────────────────────────────
      if (checkInCount >= capacity && !override) {
        await tx.scan.create({
          data: { ticketId, eventId, attendeeId: att.id, result: "over_capacity", scannerId },
        });
        return {
          result:       "over_capacity",
          message:      `Ticket fully redeemed (${checkInCount}/${capacity})`,
          attendee:     { name: att.name },
          entryNumber:  checkInCount,
          totalAllowed: capacity,
          remaining:    0,
        };
      }

      // ── Successful check-in (or override) ─────────────────────────
      const newCount    = checkInCount + 1;
      const fullyUsed   = newCount >= capacity;
      const now         = new Date();
      const scanResult  = override ? "override" : "valid";

      await tx.attendee.update({
        where: { id: att.id },
        data: {
          checkInCount:  newCount,
          lastCheckInAt: now,
          // Record timestamp of very first check-in only
          ...(att.checkedInAt == null ? { checkedInAt: now } : {}),
          // Fully redeemed = all capacity used (or override pushed past cap)
          checkedIn: fullyUsed,
        },
      });

      await tx.scan.create({
        data: {
          ticketId,
          eventId,
          attendeeId:  att.id,
          result:      scanResult,
          overridden:  override,
          entryNumber: newCount,
          scannerId,
        },
      });

      return {
        result:       scanResult,
        message:      override
          ? `Override approved — Entry ${newCount} of ${capacity}`
          : fullyUsed
            ? `Welcome! (Fully redeemed — Entry ${newCount} of ${capacity})`
            : `Welcome! — Entry ${newCount} of ${capacity} · ${capacity - newCount} remaining`,
        attendee: {
          name:     att.name,
          tier:     att.tierName ?? null,
          seat:     att.seat ?? null,
          capacity,
        },
        entryNumber:  newCount,
        totalAllowed: capacity,
        remaining:    Math.max(0, capacity - newCount),
        fullyRedeemed: fullyUsed,
      };
    });

    console.log("[scan]", {
      result:    result.result,
      ticketId,
      eventId,
      scannerId,
      entry:     (result as any).entryNumber,
      of:        (result as any).totalAllowed,
    });

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("[POST /api/scan] transaction error", { ticketId, eventId, err: err.message });
    return NextResponse.json({ error: "Scan failed — please try again" }, { status: 500 });
  }
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
    const scans = await db.scan.findMany({
      where:   { eventId },
      include: {
        attendee: {
          select: {
            id:           true,
            name:         true,
            checkInCount: true,
            tier: { select: { name: true, capacity: true } },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
      take:    200,
    });
    return NextResponse.json(scans);
  } catch (err: any) {
    console.error("[GET /api/scan]", { eventId, err: err.message });
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
}
