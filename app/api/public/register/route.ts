export const dynamic = "force-dynamic";
/**
 * POST /api/public/register
 *
 * Creates an Attendee record for FREE ticket registrations ONLY.
 * Paid ticket attendees are created exclusively in /api/mpesa/callback
 * after Safaricom confirms payment — never from a client call.
 *
 * This prevents the attack vector of calling this endpoint directly
 * with payStatus: "paid" to obtain a paid ticket without paying.
 *
 * What this does:
 *   1. Validates the tier is public, free (price === 0), and has availability
 *   2. Creates the Attendee row inside a transaction (prevents oversell)
 *   3. Returns the ticketId for the download page
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genTicketId } from "@/lib/utils";
import { z } from "zod";

const RegisterSchema = z.object({
  eventId: z.string().min(1),
  tierId:  z.string().min(1),
  name:    z.string().min(1).max(100).trim(),
  email:   z.string().email(),
  phone:   z.string().optional().default(""),
  seat:    z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 422 }
    );
  }

  const { eventId, tierId, name, email, phone, seat } = parsed.data;

  // ── Validate tier ─────────────────────────────────────────────────
  const tier = await db.tier.findUnique({
    where: { id: tierId },
    include: {
      event:  { select: { id: true, published: true } },
      _count: { select: { attendees: true } },
    },
  }).catch(() => null);

  if (!tier) {
    return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
  }
  if (tier.hidden) {
    return NextResponse.json({ error: "This ticket tier is not available" }, { status: 410 });
  }
  if (tier.event?.id !== eventId) {
    return NextResponse.json({ error: "Tier does not belong to this event" }, { status: 400 });
  }
  if (!tier.event?.published) {
    return NextResponse.json({ error: "This event is not available" }, { status: 410 });
  }

  // ── Sale window check ─────────────────────────────────────────────
  const now = new Date();
  if ((tier as any).saleStartsAt && new Date((tier as any).saleStartsAt) > now) {
    return NextResponse.json({ error: "Sales for this tier have not started yet" }, { status: 409 });
  }
  if ((tier as any).saleEndsAt && new Date((tier as any).saleEndsAt) < now) {
    return NextResponse.json({ error: "Sales for this tier have ended" }, { status: 409 });
  }

  // ── Reject paid tiers — use M-Pesa flow for those ────────────────
  if (tier.price > 0) {
    return NextResponse.json(
      { error: "Paid tickets must be purchased via M-Pesa. Use the payment flow." },
      { status: 400 }
    );
  }

  // ── Check availability ────────────────────────────────────────────
  const sold      = tier._count?.attendees ?? 0;
  const remaining = tier.quantity - sold;

  if (tier.quantity > 0 && remaining <= 0) {
    return NextResponse.json({ error: "Sorry — this ticket tier is sold out" }, { status: 409 });
  }

  // ── Atomic availability check + attendee creation ─────────────────
  try {
    const ticketId = genTicketId();

    await db.$transaction(async (tx) => {
      const soldInTx    = await tx.attendee.count({ where: { tierId } });
      const remainingInTx = tier.quantity - soldInTx;

      if (tier.quantity > 0 && remainingInTx <= 0) {
        throw new Error("SOLD_OUT");
      }

      await tx.attendee.create({
        data: {
          ticketId,
          name,
          email,
          phone:     phone || null,
          seat:      seat  || null,
          payStatus: "free",
          pricePaid: 0,
          checkedIn: false,
          emailSent: false,
          source:    "public",
          eventId,
          tierId,
        },
      });
    });

    return NextResponse.json({ ticketId }, { status: 201 });
  } catch (err: any) {
    if (err?.message === "SOLD_OUT") {
      return NextResponse.json({ error: "Sorry — this ticket tier just sold out" }, { status: 409 });
    }
    if (err?.code === "P2002") {
      // ticketId collision — astronomically rare, retry once
      const ticketId = genTicketId();
      await db.attendee.create({
        data: { ticketId, name, email, phone: phone || null, seat: seat || null,
                payStatus: "free", pricePaid: 0, checkedIn: false, emailSent: false,
                source: "public", eventId, tierId },
      });
      return NextResponse.json({ ticketId }, { status: 201 });
    }
    console.error("[POST /api/public/register]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
