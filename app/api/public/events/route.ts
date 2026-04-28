export const dynamic = "force-dynamic";
/**
 * GET /api/public/events
 *
 * Returns ALL published events across ALL organizers.
 * No authentication required — this powers the public marketplace.
 *
 * Security: Only exposes safe public data.
 * NEVER exposes:
 *   - Hidden tiers
 *   - Draft/unpublished events
 *   - Exact ticket inventory counts (only smart status labels)
 *   - Organizer private data (M-Pesa keys, payout info, etc.)
 *   - Internal analytics or revenue data
 *   - Attendee PII
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PUBLIC_EVENT_SELECT = {
  id:          true,
  name:        true,
  slug:        true,
  date:        true,
  time:        true,
  venue:       true,
  organizer:   true,
  category:    true,
  description: true,
  currency:    true,
  accent:      true,
  bgImage:     true,
  published:   true,
  capacity:    true,
};

const PUBLIC_TIER_SELECT = {
  id:           true,
  name:         true,
  description:  true,
  price:        true,
  quantity:     true,
  hidden:       true,
  sortOrder:    true,
  capacity:     true,
  saleStartsAt: true,
  saleEndsAt:   true,
};

function tierSaleStatus(tier: any, now: Date): "available" | "not_started" | "ended" | "sold_out" {
  if (tier.saleStartsAt && new Date(tier.saleStartsAt) > now) return "not_started";
  if (tier.saleEndsAt   && new Date(tier.saleEndsAt)   < now) return "ended";
  return "available";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q        = searchParams.get("q")?.toLowerCase();

  if (!prisma) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  }

  try {
    const where: any = { published: true };

    if (category && category !== "All") {
      where.category = category;
    }

    if (q) {
      where.OR = [
        { name:      { contains: q, mode: "insensitive" } },
        { venue:     { contains: q, mode: "insensitive" } },
        { organizer: { contains: q, mode: "insensitive" } },
        { category:  { contains: q, mode: "insensitive" } },
      ];
    }

    const rawEvents = await (prisma as any).event.findMany({
      where,
      select: {
        ...PUBLIC_EVENT_SELECT,
        tiers: {
          select:  PUBLIC_TIER_SELECT,
          where:   { hidden: false },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { attendees: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const events = rawEvents.map((event: any) => {
      const soldCount     = event._count?.attendees ?? 0;
      const totalCapacity = event.tiers.reduce((s: number, t: any) => s + (t.quantity ?? 0), 0);
      const remaining     = Math.max(0, totalCapacity - soldCount);
      const pctSold       = totalCapacity > 0 ? soldCount / totalCapacity : 0;

      let availabilityStatus: "available" | "few_left" | "selling_fast" | "sold_out" = "available";
      if (totalCapacity > 0 && remaining === 0) {
        availabilityStatus = "sold_out";
      } else if (remaining > 0 && remaining <= 10) {
        availabilityStatus = "few_left";
      } else if (pctSold >= 0.7) {
        availabilityStatus = "selling_fast";
      }

      return {
        id:                 event.id,
        name:               event.name,
        slug:               event.slug,
        date:               event.date,
        time:               event.time,
        venue:              event.venue,
        organizer:          event.organizer,
        category:           event.category,
        description:        event.description,
        currency:           event.currency,
        accent:             event.accent,
        bgImage:            event.bgImage,
        capacity:           event.capacity,
        availabilityStatus,
        tiers: event.tiers.map((t: any) => ({
          id:           t.id,
          name:         t.name,
          description:  t.description,
          price:        t.price,
          capacity:     t.capacity,
          sortOrder:    t.sortOrder,
          saleStatus:   tierSaleStatus(t, now),
        })),
        attendeeCount: soldCount,
      };
    });

    return NextResponse.json(events, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[GET /api/public/events]", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
