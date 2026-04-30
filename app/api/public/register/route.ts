export const dynamic = "force-dynamic";
/**
 * POST /api/public/register
 *
 * Creates an Order + individual Attendee records for FREE ticket registrations ONLY.
 * Paid ticket attendees are created exclusively in /api/mpesa/callback
 * after Safaricom confirms payment — never from a client call.
 *
 * Ticket expansion:
 *   - quantity × tier.capacity individual Attendees are created
 *   - Each gets maxCheckIns=1 (one scan per person)
 *   - slotIndex=0 on the first per slot; slotIndex=1+ on expanded extras
 *
 * Returns: { orderId, ticketId (lead), ticketCount }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { genTicketId } from "@/lib/utils";
import { z } from "zod";

const RegisterSchema = z.object({
  eventId:  z.string().min(1),
  tierId:   z.string().min(1),
  name:     z.string().min(1).max(100).trim(),
  email:    z.string().email(),
  phone:    z.string().optional().default(""),
  seat:     z.string().optional().default(""),
  quantity: z.number().int().min(1).max(20).default(1),
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

  const { eventId, tierId, name, email, phone, seat, quantity } = parsed.data;

  // ── Validate tier ─────────────────────────────────────────────────
  // Use (db as any) because slotIndex is a new field not yet in generated Prisma types.
  const tier = await (db as any).tier.findUnique({
    where: { id: tierId },
    include: {
      event:  { select: { id: true, published: true, currency: true } },
      _count: { select: { attendees: { where: { slotIndex: 0 } } } },
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
  if (tier.saleStartsAt && new Date(tier.saleStartsAt) > now) {
    return NextResponse.json({ error: "Sales for this tier have not started yet" }, { status: 409 });
  }
  if (tier.saleEndsAt && new Date(tier.saleEndsAt) < now) {
    return NextResponse.json({ error: "Sales for this tier have ended" }, { status: 409 });
  }

  // ── Reject paid tiers ─────────────────────────────────────────────
  if (tier.price > 0) {
    return NextResponse.json(
      { error: "Paid tickets must be purchased via M-Pesa. Use the payment flow." },
      { status: 400 }
    );
  }

  // ── Check availability (primary slots only, slotIndex=0) ──────────
  const sold      = tier._count?.attendees ?? 0;
  const remaining = tier.quantity - sold;

  if (tier.quantity > 0 && remaining < quantity) {
    const msg = remaining <= 0
      ? "Sorry — this ticket tier is sold out"
      : `Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining in this tier`;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // ── Atomic Order + expanded Attendee creation ────────────────────
  try {
    const primaryTicketId = genTicketId();
    const tierCapacity    = tier.capacity ?? 1;
    const ticketCount     = quantity * tierCapacity;
    const currency        = tier.event?.currency ?? "KES";

    // Use (db as any).$transaction so the tx client is typed as any —
    // required because Order, slotIndex, orderId, maxCheckIns are new schema
    // fields not yet in the generated Prisma client types.
    const orderId = await (db as any).$transaction(async (tx: any) => {
      // Re-check inventory inside the transaction (primary slots only)
      const soldInTx      = await tx.attendee.count({ where: { tierId, slotIndex: 0 } });
      const remainingInTx = tier.quantity - soldInTx;

      if (tier.quantity > 0 && remainingInTx < quantity) {
        throw new Error("SOLD_OUT");
      }

      // Create the Order record
      const order = await tx.order.create({
        data: {
          eventId,
          tierId,
          buyerName:  name,
          buyerEmail: email || null,
          buyerPhone: phone || "",
          totalPaid:  0,
          currency,
          payStatus:  "free",
          quantity,
          ticketCount,
        },
      });

      // Create one Attendee per individual entry ticket (quantity × tier.capacity).
      // slotIndex=0 = primary slot (counts toward tier.quantity inventory).
      // slotIndex=1+ = expanded extra from the same slot (does not count).
      let globalIndex = 0;
      for (let slot = 0; slot < quantity; slot++) {
        for (let cap = 0; cap < tierCapacity; cap++) {
          const ticketId  = globalIndex === 0 ? primaryTicketId : genTicketId();
          const slotIndex = cap;

          await tx.attendee.create({
            data: {
              ticketId,
              name,
              email:       email || null,
              phone:       phone || null,
              seat:        slotIndex === 0 ? (seat || null) : null,
              payStatus:   "free",
              pricePaid:   0,
              checkedIn:   false,
              emailSent:   false,
              source:      "public",
              eventId,
              tierId,
              orderId:     order.id,
              maxCheckIns: 1,
              slotIndex,
            },
          });

          globalIndex++;
        }
      }

      return order.id;
    });

    return NextResponse.json(
      { orderId, ticketId: primaryTicketId, ticketCount },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.message === "SOLD_OUT") {
      return NextResponse.json({ error: "Sorry — this ticket tier just sold out" }, { status: 409 });
    }
    console.error("[POST /api/public/register]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
