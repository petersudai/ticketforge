/**
 * app/(marketing)/marketplace/page.tsx — Server Component
 *
 * Fetches ALL published events directly from the database on the server,
 * then passes them to the interactive MarketplaceClient (Client Component).
 *
 * WHY SERVER COMPONENT:
 *   The old approach used a client-side useEffect to fetch /api/public/events.
 *   In Next.js 16 with Turbopack, API routes are compiled lazily on first
 *   request. When the marketplace page mounts and immediately fires the fetch,
 *   Turbopack may still be compiling that API route, returning a transient 404.
 *   React Strict Mode (dev) doubles the effect, producing two 404 log lines.
 *
 *   Moving the fetch to the server side eliminates the race condition: the DB
 *   query runs on the server before any HTML is sent to the browser, so the
 *   client always receives pre-populated event data with no extra round-trip.
 *
 * BENEFITS:
 *   • No client-side 404 from Turbopack lazy compilation
 *   • Better SEO — events are in the initial HTML
 *   • Faster first paint — no loading skeleton visible to users
 *   • One less round-trip (no fetch waterfall)
 */

import { prisma } from "@/lib/db";
import MarketplaceClient, { type PublicEvent } from "./MarketplaceClient";

// Always dynamic — this page should never be statically cached
export const dynamic = "force-dynamic";

// ── Server-side DB fetch ──────────────────────────────────────────────
async function getPublishedEvents(): Promise<PublicEvent[]> {
  if (!prisma) return [];

  try {
    const rawEvents = await (prisma as any).event.findMany({
      where: { published: true },
      select: {
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
        capacity:    true,
        tiers: {
          select: {
            id:          true,
            name:        true,
            description: true,
            price:       true,
            quantity:    true,
            hidden:      true,
            sortOrder:   true,
            saleStartsAt: true,
            saleEndsAt:   true,
          },
          where:   { hidden: false },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { attendees: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rawEvents.map((event: any): PublicEvent => {
      const soldCount     = event._count?.attendees ?? 0;
      const totalCapacity = event.tiers.reduce((s: number, t: any) => s + (t.quantity ?? 0), 0);
      const remaining     = Math.max(0, totalCapacity - soldCount);
      const pctSold       = totalCapacity > 0 ? soldCount / totalCapacity : 0;

      let availabilityStatus: PublicEvent["availabilityStatus"] = "available";
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
        time:               event.time ?? undefined,
        venue:              event.venue ?? undefined,
        organizer:          event.organizer ?? undefined,
        category:           event.category ?? undefined,
        description:        event.description ?? undefined,
        currency:           event.currency ?? "KES",
        accent:             event.accent ?? "#6C5CE7",
        bgImage:            event.bgImage ?? undefined,
        capacity:           event.capacity ?? undefined,
        availabilityStatus,
        tiers: event.tiers.map((t: any) => ({
          id:          t.id,
          name:        t.name,
          description: t.description ?? undefined,
          price:       t.price,
          sortOrder:   t.sortOrder,
        })),
        attendeeCount: soldCount,
      };
    });
  } catch (err) {
    console.error("[marketplace] failed to fetch events from DB:", err);
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────
export default async function MarketplacePage() {
  const events = await getPublishedEvents();
  return <MarketplaceClient initialEvents={events} />;
}
