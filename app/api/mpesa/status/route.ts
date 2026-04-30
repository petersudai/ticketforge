export const dynamic = "force-dynamic";
/**
 * GET /api/mpesa/status?checkoutRequestId=xxx
 *
 * Polls the PendingPayment row for payment status.
 * Returns "pending" | "processing" | "completed" | "failed".
 *
 * When completed, also returns orderId so the client can redirect to /order/[orderId].
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams }  = new URL(req.url);
  const checkoutRequestId = searchParams.get("checkoutRequestId");

  if (!checkoutRequestId) {
    return NextResponse.json({ error: "Missing checkoutRequestId" }, { status: 400 });
  }

  const payment = await (prisma as any).pendingPayment.findUnique({
    where:  { checkoutRequestId },
    select: { status: true, ticketId: true, orderId: true, resultDesc: true },
  }).catch(() => null);

  if (!payment) {
    return NextResponse.json({ status: "pending" });
  }

  return NextResponse.json({
    status:     payment.status,     // "pending" | "processing" | "completed" | "failed"
    ticketId:   payment.ticketId,   // lead ticket ID
    orderId:    payment.orderId,    // set when Order is created in callback
    resultDesc: payment.resultDesc,
  });
}
