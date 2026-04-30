/**
 * POST /api/mpesa
 *
 * Initiates an M-Pesa STK Push for a ticket purchase.
 *
 * Flow:
 *   1. Validate the tier exists, is public, has availability, and sale window is open
 *   2. Create a PendingPayment row with all registration details
 *   3. Initiate Safaricom STK Push
 *   4. Return checkoutRequestId for the client to poll status
 *
 * The PendingPayment row is the bridge between the STK Push and the
 * M-Pesa callback. The callback finds it by checkoutRequestId, verifies
 * the amount, then creates the Attendee and marks the payment complete.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MpesaInitSchema, validateBody } from "@/lib/validators";
import { genTicketId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const validation = validateBody(MpesaInitSchema, rawBody);
  if (!validation.success) return validation.response;

  const { phone, quantity, tierId, eventId, eventName, attendeeName, attendeeEmail } = validation.data;

  // ── Validate tier is available ────────────────────────────────────
  const tier = await (prisma as any).tier.findFirst({
    where:   { id: tierId, eventId, hidden: false },
    include: {
      event:  { select: { published: true } },
      _count: { select: { attendees: { where: { slotIndex: 0 } } } },
    },
  }).catch(() => null);

  if (!tier) {
    return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
  }
  if (!tier.event?.published) {
    return NextResponse.json({ error: "This event is not available" }, { status: 410 });
  }

  // Sale window check
  const now = new Date();
  if (tier.saleStartsAt && new Date(tier.saleStartsAt) > now) {
    return NextResponse.json({ error: "Sales for this tier have not started yet" }, { status: 409 });
  }
  if (tier.saleEndsAt && new Date(tier.saleEndsAt) < now) {
    return NextResponse.json({ error: "Sales for this tier have ended" }, { status: 409 });
  }

  const sold      = tier._count?.attendees ?? 0;
  const remaining = tier.quantity - sold;
  if (tier.quantity > 0 && remaining < quantity) {
    const msg = remaining <= 0
      ? "Sorry — this ticket tier is sold out"
      : `Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining in this tier`;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // ── Compute expected amount server-side (never trust client total) ─
  const expectedAmount = Math.round(tier.price * quantity);
  if (expectedAmount < 1) {
    return NextResponse.json(
      { error: "Use the free registration flow for zero-price tickets." },
      { status: 400 }
    );
  }

  const ticketId = genTicketId();

  // ── Simulation mode (no Daraja keys configured) ───────────────────
  const hasKeys = process.env.MPESA_CONSUMER_KEY && process.env.MPESA_PASSKEY;

  if (!hasKeys) {
    const simulatedReqId = `SIM-${Date.now()}`;
    await (prisma as any).pendingPayment.create({
      data: {
        checkoutRequestId: simulatedReqId,
        ticketId,
        eventId,
        tierId:         tier.id,
        attendeeName,
        attendeeEmail:  attendeeEmail ?? null,
        phone,
        quantity,
        expectedAmount,
        status:         "pending",
      },
    }).catch((err: any) => {
      console.error("[POST /api/mpesa] Failed to create simulation PendingPayment:", err.message);
    });

    return NextResponse.json({
      simulated:         true,
      ticketId,
      quantity,
      ticketCount:       quantity * (tier.capacity ?? 1),
      checkoutRequestId: simulatedReqId,
      message:           `Simulation mode — no real charge. STK Push would go to ${phone} for ${expectedAmount} KES.`,
    });
  }

  // ── Real STK Push ─────────────────────────────────────────────────
  try {
    const { initiateSTKPush } = await import("@/lib/mpesa");
    const stkRes = await initiateSTKPush({
      phone,
      amount:      expectedAmount,
      accountRef:  ticketId,
      description: quantity > 1
        ? `${eventName} - ${quantity}× ${tier.name}`
        : `${eventName} - ${tier.name} Ticket`,
    });

    if (stkRes.ResponseCode !== "0") {
      return NextResponse.json({ error: stkRes.ResponseDescription }, { status: 400 });
    }

    await (prisma as any).pendingPayment.create({
      data: {
        checkoutRequestId: stkRes.CheckoutRequestID,
        merchantRequestId: stkRes.MerchantRequestID,
        ticketId,
        eventId,
        tierId:         tier.id,
        attendeeName,
        attendeeEmail:  attendeeEmail ?? null,
        phone,
        quantity,
        expectedAmount,
        status:         "pending",
      },
    });

    return NextResponse.json({
      checkoutRequestId: stkRes.CheckoutRequestID,
      merchantRequestId: stkRes.MerchantRequestID,
      ticketId,
      quantity,
      ticketCount:       quantity * (tier.capacity ?? 1),
      message:           stkRes.CustomerMessage,
    });
  } catch (err: any) {
    console.error("[POST /api/mpesa]", err);
    return NextResponse.json({ error: err.message || "Payment initiation failed" }, { status: 500 });
  }
}
