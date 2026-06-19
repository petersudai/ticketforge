"use client";

/**
 * components/marketing/DiscoverEvents.tsx
 *
 * Landing-page section that showcases real, live events. Reinforces the
 * "get discovered" value prop the PM flagged: organisers' events are shown
 * to the public, driving discovery beyond their own audience.
 *
 * Data: client-fetches a handful of upcoming events from the existing
 * public API (/api/public/events). This is below the fold and secondary,
 * so a client fetch with a graceful skeleton is appropriate — unlike the
 * marketplace, it isn't the primary content and isn't SEO-critical.
 *
 * Resilience: if the fetch fails OR there are no upcoming events, the
 * ENTIRE section hides itself (renders null). The landing page must never
 * show a broken or empty "discover events" block.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { EventMiniCard, type MiniEvent } from "./EventMiniCard";

// Local helper: an event is upcoming if its (end) day is today or later.
// Mirrors the marketplace's whole-day logic without importing its internals.
function isUpcoming(ev: any): boolean {
  const day = (ev.endDate ?? ev.date) as string | undefined;
  if (!day) return false;
  const now = new Date();
  const todayStr =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return day >= todayStr;
}

export function DiscoverEvents() {
  const [events,  setEvents]  = useState<MiniEvent[] | null>(null);
  const [failed,  setFailed]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/events")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((data: any[]) => {
        if (cancelled) return;
        const upcoming = (Array.isArray(data) ? data : [])
          .filter(isUpcoming)
          .slice(0, 4);
        setEvents(upcoming);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  // Hide the whole section on failure or when there's nothing to show.
  // (events === null means still loading → render a light skeleton.)
  if (failed) return null;
  if (events !== null && events.length === 0) return null;

  return (
    <section className="py-16 sm:py-24 md:py-28 px-4 sm:px-6 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-[12px] text-brand-300 font-semibold mb-4">
              <Compass className="w-3 h-3" />
              Get discovered
            </div>
            <h2 className="font-heading font-extrabold text-[26px] sm:text-[32px] md:text-[40px] tracking-tight leading-[1.1] text-white">
              Your event, in front of <br className="hidden sm:block" />a whole new audience
            </h2>
            <p className="text-[14px] sm:text-[15px] text-white/50 max-w-[460px] mt-3 leading-relaxed">
              Every event you publish appears on the TicketForge marketplace, where new attendees browse and book. Selling tickets is only half of it. We help people find you.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="shrink-0 inline-flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-white font-semibold text-[13px] px-5 py-2.5 rounded-[11px] transition-all"
          >
            Browse all events <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid: skeleton while loading, real cards once ready */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {events === null
            ? [0, 1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden border border-white/[0.07] animate-pulse h-[390px]"
                  style={{ background: "rgba(15,15,22,0.9)" }}>
                  <div className="h-[220px] bg-white/[0.04]" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                    <div className="h-2.5 bg-white/[0.04] rounded w-1/2" />
                    <div className="h-2.5 bg-white/[0.04] rounded w-2/5" />
                  </div>
                </div>
              ))
            : events.map(ev => <EventMiniCard key={ev.id} event={ev} />)}
        </div>
      </div>
    </section>
  );
}
