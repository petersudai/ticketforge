"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";
import {
  Search, MapPin, Calendar,
  Ticket, ArrowRight, X, Sparkles,
} from "lucide-react";

import { CATEGORIES as ALL_CATEGORIES, catStyle, catButtonColor } from "@/lib/constants/categories";

// ── Shared types ─────────────���────────────────────────────────────────
export type PublicTier = {
  id: string; name: string; description?: string;
  price: number; sortOrder: number;
};

export type PublicEvent = {
  id: string; name: string; slug: string;
  date: string; time?: string;
  // endDate/endTime power the "is fully over" check. An event with an endDate
  // is considered past only AFTER that endDate. An event with only date is
  // considered past starting the day AFTER its date (gives it a full day
  // grace period). This handles single-day events, multi-day festivals, and
  // overnight events (e.g. a Friday night gig that ends Sat morning) without
  // needing to parse the freeform time strings.
  endDate?: string; endTime?: string;
  venue?: string; organizer?: string; category?: string; description?: string;
  currency: string; accent: string; bgImage?: string; capacity?: number;
  availabilityStatus: "available" | "few_left" | "selling_fast" | "sold_out";
  tiers: PublicTier[];
  attendeeCount: number;
};

// ── Date helpers ───────────────────────────────────────────────���──────

function shortDate(dateStr?: string | null): { month: string; day: string } | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length < 3) return null;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day:   String(d.getDate()),
  };
}

function cardDateLine(dateStr?: string | null, time?: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length < 3) return null;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const label = d.toLocaleString("en-US", { month: "short", day: "numeric" });
  return time ? `${label}, ${time}` : label;
}

/**
 * Has this event fully ended?
 *
 * An event is "fully over" when its end day is strictly before today (local
 * time). We deliberately ignore the time-of-day strings (`time` / `endTime`)
 * because they're freeform user input ("7 PM", "19:00", "7pm-ish") and
 * parsing them reliably across formats is fragile. Using whole-day
 * granularity gives every event the full courtesy of its end date.
 *
 *   • Multi-day event:  past when today > endDate
 *   • Single-day event: past when today > date  (endDate falls back to date)
 *
 * String comparison works because dates are stored as YYYY-MM-DD —
 * lexicographic order matches chronological order.
 */
function isEventFullyOver(event: PublicEvent): boolean {
  const endDay = event.endDate ?? event.date;
  if (!endDay) return false;

  const now      = new Date();
  const todayStr =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return endDay < todayStr;
}

// ── Event card ────────────────────────────────────────────────────────
//
// `isPast` reduces visual prominence (opacity, grayscale shift on the hero
// image, "Ended" tag overriding the active-status badges) and replaces the
// "Get Tickets" CTA with "View event". The card still links through to the
// event page in case the visitor wants to see what the lineup was.
function EventCard({ event, isPast = false }: { event: PublicEvent; isPast?: boolean }) {
  const minPrice    = event.tiers.length > 0 ? Math.min(...event.tiers.map(t => t.price)) : 0;
  const isFree      = event.tiers.length > 0 && minPrice === 0;
  const soldOut     = event.availabilityStatus === "sold_out";
  const fewLeft     = event.availabilityStatus === "few_left";
  const sellingFast = event.availabilityStatus === "selling_fast";
  const cs          = catStyle(event.category);
  const accent      = catButtonColor(event.category);
  const sd          = shortDate(event.date);
  const dateLine    = cardDateLine(event.date, event.time);

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col h-[390px] border border-white/[0.07] transition-all duration-300 group-hover:border-white/[0.18] group-hover:-translate-y-[3px] group-hover:shadow-2xl"
        style={{
          background:  "rgba(15,15,22,0.9)",
          boxShadow:   "0 2px 20px rgba(0,0,0,0.3)",
          willChange:  "transform",
          // Past events fade and lose colour weight so the eye reads them
          // as archival without rendering them invisible.
          opacity:     isPast ? 0.65 : 1,
          filter:      isPast ? "saturate(0.7)"  : undefined,
        }}
      >
        {/* Hero (≈60% of card height) */}
        <div
          className="relative h-[220px] shrink-0 overflow-hidden"
          style={{
            background: event.bgImage
              ? undefined
              : `linear-gradient(135deg, ${event.accent}28, ${event.accent}08)`,
          }}
        >
          {event.bgImage && (
            <Image
              src={event.bgImage}
              alt={event.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              style={{ opacity: 0.82, willChange: "transform" }}
            />
          )}

          {/* Past events take precedence over sold-out: an ended event is
              past first, sold-out second. */}
          {isPast ? (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span
                className="text-[11px] font-bold tracking-wide px-4 py-1.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color:      "rgba(255,255,255,0.55)",
                  border:     "1px solid rgba(255,255,255,0.15)",
                }}
              >
                ENDED
              </span>
            </div>
          ) : soldOut && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span
                className="text-[11px] font-bold tracking-wide px-4 py-1.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                SOLD OUT
              </span>
            </div>
          )}

          {/* Category pill */}
          <div className="absolute top-3 left-3">
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full leading-none"
              style={{
                background: "rgba(0,0,0,0.58)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: cs.text,
                border: `1px solid ${cs.text}38`,
              }}
            >
              {event.category || "Event"}
            </span>
          </div>

          {/* Date stamp */}
          {sd && (
            <div className="absolute top-3 right-3">
              <div
                className="flex flex-col items-center justify-center w-[42px] py-1.5 rounded-xl"
                style={{
                  background: "rgba(0,0,0,0.28)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.20)",
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/70 leading-none">
                  {sd.month}
                </span>
                <span className="text-[22px] font-black text-white leading-tight mt-0.5 tabular-nums">
                  {sd.day}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Gradient seam */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{ top: 148, height: 75, background: "linear-gradient(to bottom, transparent 0%, rgba(15,15,22,1) 100%)" }}
        />

        {/* Content */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
          <h3 className="font-heading font-bold text-[14px] leading-snug text-white line-clamp-1 truncate group-hover:text-brand-300 transition-colors mb-2">
            {event.name}
          </h3>

          <div className="flex flex-col gap-1 mb-3">
            {event.venue && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/45">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
            {dateLine && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/38">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>{dateLine}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1">
            {event.tiers.length > 0 && (
              <span
                className="text-[13px] font-bold"
                style={{ color: isFree ? "#55efc4" : accent }}
              >
                {isFree ? "Free" : `From ${event.currency} ${minPrice.toLocaleString()}`}
              </span>
            )}
            {/* Active-state hype badges suppressed for past events — selling fast
                / few left is meaningless once the event has happened. */}
            {!isPast && !soldOut && fewLeft && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: "rgba(225,112,85,0.12)", color: "#e17055", border: "1px solid rgba(225,112,85,0.22)" }}
              >
                🔥 Few left
              </span>
            )}
            {!isPast && !soldOut && sellingFast && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: "rgba(253,203,110,0.1)", color: "#fdcb6e", border: "1px solid rgba(253,203,110,0.18)" }}
              >
                ⚡ Selling fast
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-white/[0.06]">
            <span className="text-[10px] text-white/28 truncate">
              {event.organizer || "TicketForge"}
            </span>
            <span
              className="shrink-0 text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 group-hover:gap-2"
              style={(isPast || soldOut) ? {
                background: "rgba(255,255,255,0.05)",
                color:      "rgba(255,255,255,0.35)",
                border:     "1px solid rgba(255,255,255,0.08)",
              } : {
                background: `${accent}1a`,
                color:      accent,
                border:     `1px solid ${accent}38`,
              }}
            >
              {isPast
                ? <><span>View event</span><ArrowRight className="w-3 h-3" /></>
                : soldOut
                ? "Sold out"
                : <><span>Get Tickets</span><ArrowRight className="w-3 h-3" /></>}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton card ───────────────────────────���─────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.07] animate-pulse h-[390px] flex flex-col"
      style={{ background: "rgba(15,15,22,0.9)" }}>
      <div className="h-[220px] bg-white/[0.04]" />
      <div className="px-4 pt-3 pb-4 space-y-3">
        <div className="h-4 bg-white/[0.06] rounded-md w-3/4" />
        <div className="h-3 bg-white/[0.04] rounded-md w-1/2" />
        <div className="h-3 bg-white/[0.04] rounded-md w-2/5" />
        <div className="h-4 bg-white/[0.05] rounded-md w-1/3 mt-1" />
        <div className="h-px bg-white/[0.05] mt-2" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-3 bg-white/[0.04] rounded-md w-1/4" />
          <div className="h-7 bg-white/[0.05] rounded-full w-24" />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────���─────────────────────────���────────
function EmptyMarketplace() {
  return (
    <div className="col-span-full text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
        <Ticket className="w-8 h-8 text-white/20" />
      </div>
      <h3 className="font-heading font-bold text-[18px] text-white mb-2">No events found</h3>
      <p className="text-[13px] text-white/35">Try a different search or browse all categories.</p>
    </div>
  );
}

// ── Main interactive marketplace UI ───────────────────────────────────
const FILTER_CATEGORIES = ["All", ...ALL_CATEGORIES];

interface MarketplaceClientProps {
  /** Events pre-fetched server-side — no client-side fetch needed. */
  initialEvents: PublicEvent[];
}

export default function MarketplaceClient({ initialEvents }: MarketplaceClientProps) {
  const [query,    setQuery]    = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy,   setSortBy]   = useState<"date" | "price-low" | "price-high" | "popular">("date");

  // Filter (search + category) and split into upcoming + past. Past events
  // are events that have FULLY ended (see isEventFullyOver). They're moved
  // into a separate section at the bottom of the page rather than mixed
  // into the main grid, where they'd otherwise appear first under
  // "Soonest first" sort because their dates are smallest.
  const { upcoming, past } = useMemo(() => {
    const matchesFilters = (e: PublicEvent) => {
      if (query) {
        const q = query.toLowerCase();
        if (
          !e.name.toLowerCase().includes(q) &&
          !e.venue?.toLowerCase().includes(q) &&
          !e.organizer?.toLowerCase().includes(q)
        ) return false;
      }
      if (category !== "All" && e.category !== category) return false;
      return true;
    };

    const matched  = initialEvents.filter(matchesFilters);
    const upcoming = matched.filter(e => !isEventFullyOver(e));
    const past     = matched.filter(e =>  isEventFullyOver(e));

    // Sort upcoming per user's chosen sort.
    if (sortBy === "date") {
      upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === "price-low") {
      upcoming.sort((a, b) =>
        Math.min(0, ...a.tiers.map(t => t.price)) - Math.min(0, ...b.tiers.map(t => t.price))
      );
    } else if (sortBy === "price-high") {
      upcoming.sort((a, b) =>
        Math.max(0, ...b.tiers.map(t => t.price)) - Math.max(0, ...a.tiers.map(t => t.price))
      );
    } else if (sortBy === "popular") {
      upcoming.sort((a, b) => b.attendeeCount - a.attendeeCount);
    }

    // Past events are always sorted most-recent-first regardless of the
    // selected sort. The user's sort applies to "what to do next", not to
    // archaeology — most recent past is the most relevant past.
    past.sort((a, b) =>
      new Date(b.endDate ?? b.date).getTime() - new Date(a.endDate ?? a.date).getTime()
    );

    return { upcoming, past };
  }, [initialEvents, query, category, sortBy]);

  // Hero badge count: only TRULY upcoming events (not past), regardless of
  // current filter state. Uses isEventFullyOver for consistency with the
  // grid split below.
  const upcomingCount = initialEvents.filter(e => !isEventFullyOver(e)).length;

  return (
    <>
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-[96px] pb-10 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(108,92,231,0.15) 0%, transparent 60%)" }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-[12px] text-brand-300 font-semibold mb-6">
              <Sparkles className="w-3 h-3" />
              {`${upcomingCount} upcoming event${upcomingCount !== 1 ? "s" : ""}`}
            </div>
            <h1 className="font-heading font-extrabold text-[28px] sm:text-[40px] md:text-[60px] tracking-[-0.03em] leading-[1.05] text-white mb-4">
              Discover &amp; book<br />
              <span style={{
                background: "linear-gradient(135deg, #a29cf4 0%, #6C5CE7 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>events near you</span>
            </h1>
            <p className="text-[16px] text-white/45 max-w-[480px] mx-auto leading-relaxed">
              Browse events, pick your tier, and pay with M-Pesa in seconds. Your QR ticket arrives instantly.
            </p>
          </div>

          {/* Search + sort */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                aria-label="Search events"
                placeholder="Search events, venues, organisers…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-white placeholder:text-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              {query && (
                <button onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              aria-label="Sort events"
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-3 rounded-xl text-[13px] outline-none cursor-pointer"
              style={{ background: "#16161f", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <option value="date"       style={{ background: "#16161f", color: "#fff" }}>Soonest first</option>
              <option value="price-low"  style={{ background: "#16161f", color: "#fff" }}>Price: Low to high</option>
              <option value="price-high" style={{ background: "#16161f", color: "#fff" }}>Price: High to low</option>
              <option value="popular"    style={{ background: "#16161f", color: "#fff" }}>Most popular</option>
            </select>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {FILTER_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 cursor-pointer"
                style={{
                  background: category === cat ? "#6C5CE7" : "rgba(255,255,255,0.05)",
                  color:      category === cat ? "#fff"    : "rgba(255,255,255,0.45)",
                  border:     category === cat ? "none"    : "1px solid rgba(255,255,255,0.08)",
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results — upcoming on top, past at the bottom in its own section */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[13px] text-white/35">
              {upcoming.length === 0 && past.length === 0
                ? "No events found"
                : (() => {
                    const total = upcoming.length + past.length;
                    return `${total} event${total !== 1 ? "s" : ""}${
                      query ? ` for "${query}"` : category !== "All" ? ` in ${category}` : ""
                    }${past.length > 0 ? ` · ${past.length} past` : ""}`;
                  })()}
            </span>
            {(query || category !== "All") && (
              <button onClick={() => { setQuery(""); setCategory("All"); }}
                className="text-[12px] text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Upcoming grid — empty state only shows when BOTH lists are empty */}
          {upcoming.length === 0 && past.length === 0 ? (
            <EmptyMarketplace />
          ) : upcoming.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {upcoming.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          ) : (
            // Edge case: filter matches only past events. Show a soft note
            // so the user knows their filter didn't match anything upcoming.
            <div className="text-center py-12">
              <p className="text-[13px] text-white/45">
                No upcoming events match your search.
                {past.length > 0 && " Past events matching your search are below."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Past events section — only rendered when there's at least one */}
      {past.length > 0 && (
        <section className="px-4 sm:px-6 pb-20 pt-4 border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-baseline justify-between mb-5 mt-8">
              <div>
                <h2 className="font-heading font-bold text-[18px] sm:text-[20px] text-white/70 tracking-tight">
                  Past events
                </h2>
                <p className="text-[12px] text-white/35 mt-1">
                  {past.length} event{past.length !== 1 ? "s" : ""} that already happened.
                  Recap or browse what you missed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {past.map(event => <EventCard key={event.id} event={event} isPast />)}
            </div>
          </div>
        </section>
      )}

      {/* Organiser CTA */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left"
            style={{
              background: "linear-gradient(135deg, rgba(108,92,231,0.12) 0%, rgba(72,52,212,0.08) 100%)",
              border: "1px solid rgba(108,92,231,0.2)",
            }}
          >
            <div>
              <h3 className="font-heading font-extrabold text-[20px] sm:text-[24px] text-white mb-2">Hosting an event?</h3>
              <p className="text-[14px] text-white/45">Create your event in minutes and start selling tickets with M-Pesa today.</p>
            </div>
            <Link
              href="/auth/signup"
              className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[14px] px-6 py-3 rounded-[11px] transition-all hover:scale-[1.02] whitespace-nowrap"
            >
              Start selling tickets <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
