export const dynamic = "force-dynamic";
/**
 * GET /api/order/[orderId]
 *
 * Returns an Order record with all its Attendee tickets.
 * Public endpoint — no auth required. The orderId itself is the access credential
 * (unguessable cuid), same security model as /ticket/[ticketId].
 *
 * Used by the /order/[orderId] confirmation page to show all tickets in a purchase.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ orderId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { orderId } = await params;

  let order: any;
  try {
    // Use (db as any) because the Order model is new and not yet in generated Prisma types.
    order = await (db as any).order.findUnique({
      where:   { id: orderId },
      include: {
        event: {
          select: {
            id: true, name: true, slug: true, date: true,
            time: true, endTime: true, endDate: true, venue: true,
            organizer: true, category: true, currency: true,
            accent: true, bgImage: true,
          },
        },
        tier: {
          select: { id: true, name: true, capacity: true, price: true },
        },
        attendees: {
          orderBy: [{ slotIndex: "asc" }, { createdAt: "asc" }],
          select: {
            id: true, ticketId: true, name: true, email: true,
            payStatus: true, pricePaid: true, checkedIn: true,
            slotIndex: true, maxCheckIns: true, createdAt: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/order/[orderId]]", err);
    return NextResponse.json({ error: "Failed to look up order" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
