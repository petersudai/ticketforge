export const dynamic = "force-dynamic";
/**
 * GET /api/mpesa/status?checkoutRequestId=xxx
 *
 * Polls the PendingPayment row for payment status.
 * Returns "pending" | "completed" | "failed".
 *
 * Design: we poll our own DB (fast, reliable, no Daraja rate limits)
 * rather than Daraja's STK query endpoint. The M-Pesa callback updates
 * the PendingPayment row when Safaricom confirms payment.
 *
 * The frontend polls this endpoint and redirects to the ticket page
 * when status === "completed".
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams }    = new URL(req.url);
  const checkoutRequestId   = searchParams.get("checkoutRequestId");

  if (!checkoutRequestId) {
    return NextResponse.json({ error: "Missing checkoutRequestId" }, { status: 400 });
  }

  const payment = await (prisma as any).pendingPayment.findUnique({
    where:  { checkoutRequestId },
    select: { status: true, ticketId: true, resultDesc: true },
  }).catch(() => null);

  if (!payment) {
    // Not found in DB — could be a simulation that didn't persist, or invalid ID
    return NextResponse.json({ status: "pending" });
  }

  return NextResponse.json({
    status:     payment.status,     // "pending" | "processing" | "completed" | "failed"
    ticketId:   payment.ticketId,   // available once status = "completed"
    resultDesc: payment.resultDesc, // human-readable reason on failure
  });
}
