export const dynamic = "force-dynamic";
/**
 * POST /api/mpesa/callback
 *
 * Safaricom calls this endpoint after the buyer approves (or cancels)
 * the STK Push on their phone. This is the ONLY place where a paid
 * Attendee record is created — never from the client.
 *
 * Security:
 *   - Looks up PendingPayment by checkoutRequestId (not client-supplied)
 *   - Verifies paid amount matches expectedAmount (prevents underpayment)
 *   - Uses a DB transaction: marks payment completed + creates Attendee atomically
 *   - Marks PendingPayment as "processing" before the transaction to prevent
 *     replay attacks if Safaricom retries the callback
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
      // Already processed or never existed — safe to ignore
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
    // Allow 1 KES tolerance for rounding differences in Safaricom's system.
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

    // ── Create Attendee + mark payment complete, atomically ───────────
    await (prisma as any).$transaction(async (tx: any) => {
      // Re-check inventory inside the transaction
      const soldInTx    = await tx.attendee.count({ where: { tierId: pending.tierId } });
      const tierInTx    = await tx.tier.findUnique({ where: { id: pending.tierId }, select: { quantity: true } });
      const remaining   = (tierInTx?.quantity ?? 0) - soldInTx;

      if ((tierInTx?.quantity ?? 0) > 0 && remaining <= 0) {
        // Sold out after payment was initiated — rare but possible
        await tx.pendingPayment.update({
          where: { checkoutRequestId: CheckoutRequestID },
          data:  { status: "failed", resultDesc: "Sold out during payment processing" },
        });
        throw new Error("SOLD_OUT_AFTER_PAYMENT");
      }

      await tx.attendee.create({
        data: {
          ticketId:          pending.ticketId,
          name:              pending.attendeeName,
          email:             pending.attendeeEmail,
          phone:             pending.phone,
          payStatus:         "paid",
          pricePaid:         paidAmount,
          checkedIn:         false,
          emailSent:         false,
          source:            "public",
          eventId:           pending.eventId,
          tierId:            pending.tierId,
          mpesaReceiptNumber: receiptNumber,
        },
      });

      await tx.pendingPayment.update({
        where: { checkoutRequestId: CheckoutRequestID },
        data:  { status: "completed", mpesaReceiptNumber: receiptNumber },
      });
    });

    console.log(`[mpesa/callback] Attendee created for ticket ${pending.ticketId}`);
  } catch (err: any) {
    if (err?.message === "SOLD_OUT_AFTER_PAYMENT") {
      console.warn("[mpesa/callback] Sold out after payment — manual refund required", { CheckoutRequestID });
    } else {
      console.error("[mpesa/callback] Transaction failed:", err.message);
      // Reset to failed so it doesn't get stuck in "processing"
      await (prisma as any).pendingPayment.updateMany({
        where: { checkoutRequestId: CheckoutRequestID, status: "processing" },
        data:  { status: "failed", resultDesc: err.message },
      }).catch(() => {});
    }
  }

  return ACCEPTED;
}
