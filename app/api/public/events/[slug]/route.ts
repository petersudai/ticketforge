export const dynamic = "force-dynamic";
/**
 * GET /api/public/events/[slug]
 *
 * Returns a single published event by slug for the public event page.
 * No auth required. Never exposes hidden tiers (unless ?tier=TOKEN matches),
 * exact inventory counts, or organizer-private data.
 *
 * Hidden tier unlock: ?tier=<inviteToken> appends that tier to the list
 * if the token matches a hidden tier on this event.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

function buildTierStatus(t: any, now: Date) {
  // _count.attendees is filtered to slotIndex=0 (primary slots) to correctly track tier.quantity consumption.
  // Legacy attendees all have slotIndex=0 by default, so backward compat is preserved.
  const sold      = t._count?.attendees ?? 0;
  const remaining = Math.max(0, t.quantity - sold);
  const soldOut   = t.quantity === 0 || remaining === 0;
  const fewLeft   = !soldOut && remaining <= 10;

  // Sale window check
  let saleWindowStatus: "active" | "not_started" | "ended" = "active";
  if (t.saleStartsAt && new Date(t.saleStartsAt) > now) saleWindowStatus = "not_started";
  else if (t.saleEndsAt && new Date(t.saleEndsAt) < now) saleWindowStatus = "ended";

  const availabilityStatus = soldOut
    ? "sold_out"
    : fewLeft
    ? "few_left"
    : sold / Math.max(t.quantity, 1) >= 0.7
    ? "selling_fast"
    : "available";

  return {
    id:               t.id,
    name:             t.name,
    description:      t.description,
    price:            t.price,
    capacity:         t.capacity,
    sortOrder:        t.sortOrder,
    saleStartsAt:     t.saleStartsAt,
    saleEndsAt:       t.saleEndsAt,
    soldOut,
    availabilityStatus,
    saleWindowStatus,
    // Admitted people count (units * capacity) — never expose raw counts
    totalAdmitted:    sold * (t.capacity ?? 1),
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const tierToken = new URL(req.url).searchParams.get("tier");

  if (!prisma) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  try {
    const event = await (prisma as any).event.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        published: true,
      },
      select: {
        id:          true,
        name:        true,
        slug:        true,
        date:        true,
        time:        true,
        endTime:     true,
        endDate:     true,
        venue:       true,
        organizer:   true,
        category:    true,
        description: true,
        currency:    true,
        accent:      true,
        bgImage:     true,
        capacity:    true,
        tiers: {
          orderBy: { sortOrder: "asc" },
          select: {
            id:           true,
            name:         true,
            description:  true,
            price:        true,
            quantity:     true,
            capacity:     true,
            hidden:       true,
            inviteToken:  true,
            sortOrder:    true,
            saleStartsAt: true,
            saleEndsAt:   true,
            _count:       { select: { attendees: { where: { slotIndex: 0 } } } },
          },
        },
        _count: { select: { attendees: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const now = new Date();

    // Visible tiers: public (not hidden) + any tier unlocked by invite token
    const visibleTiers = event.tiers.filter((t: any) => {
      if (!t.hidden) return true;
      if (tierToken && t.inviteToken && t.inviteToken === tierToken) return true;
      return false;
    });

    const tiers = visibleTiers.map((t: any) => buildTierStatus(t, now));

    const totalSold      = event._count?.attendees ?? 0;
    const allTiersSoldOut = tiers.length > 0 && tiers.every((t: any) => t.soldOut);

    return NextResponse.json({
      id:            event.id,
      name:          event.name,
      slug:          event.slug,
      date:          event.date,
      time:          event.time,
      endTime:       event.endTime,
      endDate:       event.endDate,
      venue:         event.venue,
      organizer:     event.organizer,
      category:      event.category,
      description:   event.description,
      currency:      event.currency,
      accent:        event.accent,
      bgImage:       event.bgImage,
      capacity:      event.capacity,
      tiers,
      soldOut:       allTiersSoldOut,
      attendeeCount: totalSold,
    });
  } catch (err) {
    console.error("[GET /api/public/events/[slug]]", err);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }
}
