export const dynamic = "force-dynamic";
/**
 * POST /api/mpesa/callback
 *
 * Safaricom calls this endpoint after the buyer approves (or cancels)
 * the STK Push on their phone. This is the ONLY place where a paid
 * Order + Attendee records are created — never from the client.
 *
 * Security:
 *   - Looks up PendingPayment by checkoutRequestId (not client-supplied)
 *   - Verifies paid amount matches expectedAmount (prevents underpayment)
 *   - Uses a DB transaction: marks payment completed + creates Order + Attendees atomically
 *   - Marks PendingPayment as "processing" before the transaction to prevent
 *     replay attacks if Safaricom retries the callback
 *
 * Ticket expansion:
 *   - Each tier slot purchased expands into tier.capacity individual Attendees
 *   - Example: 2× Couple ticket (capacity=2) → 4 Attendees, each maxCheckIns=1
 *   - slotIndex=0 on the first Attendee per slot (counts toward tier.quantity);
 *     slotIndex=1+ on extras (do not count toward inventory)
 *
 * Always returns { ResultCode: 0 } to Safaricom regardless of outcome,
 * or they will retry indefinitely.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ACCEPTED = NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return ACCEPTED; }

  const stkCallback = (body as any)?.Body?.stkCallback;
  if (!stkCallback) {
    console.warn("[mpesa/callback] Missing stkCallback in payload");
    return ACCEPTED;
  }

  const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

  // ── Payment failed or cancelled by user ───────────────────────────
  if (ResultCode !== 0) {
    console.log(`[mpesa/callback] Payment failed: ${ResultDesc} (${CheckoutRequestID})`);
    await (prisma as any).pendingPayment.updateMany({
      where: { checkoutRequestId: CheckoutRequestID, status: "pending" },
      data:  { status: "failed", resultDesc: ResultDesc },
    }).catch(() => {});
    return ACCEPTED;
  }

  // ── Payment succeeded — extract Safaricom metadata ────────────────
  const items = CallbackMetadata?.Item ?? [];
  const get   = (name: string) => items.find((i: any) => i.Name === name)?.Value;

  const paidAmount:    number = get("Amount");
  const receiptNumber: string = get("MpesaReceiptNumber");

  if (!receiptNumber || paidAmount == null) {
    console.error("[mpesa/callback] Missing Amount or MpesaReceiptNumber in callback", stkCallback);
    return ACCEPTED;
  }

  console.log(`[mpesa/callback] Payment confirmed: ${receiptNumber} — KES ${paidAmount}`);

  try {
    // ── Atomic claim: mark as "processing" to prevent replay attacks ─
    const claimed = await (prisma as any).pendingPayment.updateMany({
      where: { checkoutRequestId: CheckoutRequestID, status: "pending" },
      data:  { status: "processing" },
    });

    if (claimed.count === 0) {
      console.warn(`[mpesa/callback] No claimable PendingPayment for ${CheckoutRequestID}`);
      return ACCEPTED;
    }

    const pending = await (prisma as any).pendingPayment.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (!pending) {
      console.error("[mpesa/callback] PendingPayment disappeared after claim", { CheckoutRequestID });
      return ACCEPTED;
    }

    // ── Amount verification: paid must be >= expected ─────────────────
    if (paidAmount < pending.expectedAmount - 1) {
      console.error("[mpesa/callback] Underpayment detected", {
        checkoutRequestId: CheckoutRequestID,
        expected: pending.expectedAmount,
        paid:     paidAmount,
      });
      await (prisma as any).pendingPayment.update({
        where: { checkoutRequestId: CheckoutRequestID },
        data:  { status: "failed", resultDesc: `Underpayment: expected ${pending.expectedAmount}, got ${paidAmount}` },
      }).catch(() => {});
      return ACCEPTED;
    }

    // ── Create Order + expanded Attendees + mark payment complete ────
    const quantity = pending.quantity ?? 1;

    await (prisma as any).$transaction(async (tx: any) => {
      // Fetch tier capacity for ticket expansion
      const tier = await tx.tier.findUnique({
        where:  { id: pending.tierId },
        select: { quantity: true, capacity: true, event: { select: { currency: true } } },
      });

      const tierCapacity   = tier?.capacity ?? 1;
      const ticketCount    = quantity * tierCapacity;   // total individual entry tickets
      const pricePerTicket = Math.round((paidAmount / ticketCount) * 100) / 100;
      const currency       = tier?.event?.currency ?? "KES";

      // Re-check inventory: count primary slots (slotIndex=0) only
      const soldInTx  = await tx.attendee.count({ where: { tierId: pending.tierId, slotIndex: 0 } });
      const remaining = (tier?.quantity ?? 0) - soldInTx;

      if ((tier?.quantity ?? 0) > 0 && remaining < quantity) {
        await tx.pendingPayment.update({
          where: { checkoutRequestId: CheckoutRequestID },
          data:  { status: "failed", resultDesc: "Insufficient capacity during payment processing" },
        });
        throw new Error("SOLD_OUT_AFTER_PAYMENT");
      }

      // Create the Order record
      const order = await tx.order.create({
        data: {
          eventId:           pending.eventId,
          tierId:            pending.tierId,
          buyerName:         pending.attendeeName,
          buyerEmail:        pending.attendeeEmail ?? null,
          buyerPhone:        pending.phone,
          totalPaid:         paidAmount,
          currency,
          mpesaReceiptNumber: receiptNumber,
          payStatus:         "paid",
          quantity,
          ticketCount,
        },
      });

      // Create one Attendee per individual entry ticket (quantity × tier.capacity).
      // slotIndex=0 on the first per slot (primary, counts toward tier.quantity);
      // slotIndex=1+ on extras within the same slot.
      const { genTicketId } = await import("@/lib/utils");
      let   globalIndex = 0;

      for (let slot = 0; slot < quantity; slot++) {
        for (let cap = 0; cap < tierCapacity; cap++) {
          const ticketId  = globalIndex === 0 ? pending.ticketId : genTicketId();
          const slotIndex = cap; // 0 = primary for this slot, 1+ = expanded extras

          await tx.attendee.create({
            data: {
              ticketId,
              name:              pending.attendeeName,
              email:             pending.attendeeEmail ?? null,
              phone:             pending.phone,
              payStatus:         "paid",
              pricePaid:         pricePerTicket,
              checkedIn:         false,
              emailSent:         false,
              source:            "public",
              eventId:           pending.eventId,
              tierId:            pending.tierId,
              mpesaReceiptNumber: receiptNumber,
              orderId:           order.id,
              maxCheckIns:       1,   // individual entry pass — one scan each
              slotIndex,
            },
          });

          globalIndex++;
        }
      }

      await tx.pendingPayment.update({
        where: { checkoutRequestId: CheckoutRequestID },
        data:  { status: "completed", mpesaReceiptNumber: receiptNumber, orderId: order.id },
      });

      console.log(`[mpesa/callback] Order ${order.id}: ${ticketCount} ticket(s) created (${quantity} slot(s) × capacity ${tierCapacity})`);
    });

  } catch (err: any) {
    if (err?.message === "SOLD_OUT_AFTER_PAYMENT") {
      console.warn("[mpesa/callback] Sold out after payment — manual refund required", { CheckoutRequestID });
    } else {
      console.error("[mpesa/callback] Transaction failed:", err.message);
      await (prisma as any).pendingPayment.updateMany({
        where: { checkoutRequestId: CheckoutRequestID, status: "processing" },
        data:  { status: "failed", resultDesc: err.message },
      }).catch(() => {});
    }
  }

  return ACCEPTED;
}
