"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";
import {
  Search, MapPin, Calendar,
  Ticket, ArrowRight, X, Sparkles,
} from "lucide-react";

// ── Category colours — imported from shared constants ─────────────────
import { CATEGORIES as ALL_CATEGORIES, catStyle, catButtonColor } from "@/lib/constants/categories";

// ── Public event type (from /api/public/events) ───────────────────────
// Inventory counts are intentionally excluded — buyers see status labels only.
type PublicTier = {
  id: string; name: string; description?: string;
  price: number; color: string; sortOrder: number;
};
type PublicEvent = {
  id: string; name: string; slug: string; date: string; time?: string;
  venue?: string; organizer?: string; category?: string; description?: string;
  currency: string; accent: string; bgImage?: string; capacity?: number;
  availabilityStatus: "available" | "few_left" | "selling_fast" | "sold_out";
  tiers: PublicTier[];
  attendeeCount: number;
};

// ── Date helpers ──────────────────────────────────────────────────────

// Badge: "OCT" / "12" for the top-right hero stamp
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

// Card body line: "May 10, 3:00 PM" — no timezone drift
function cardDateLine(dateStr?: string | null, time?: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length < 3) return null;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const label = d.toLocaleString("en-US", { month: "short", day: "numeric" }); // "May 10"
  return time ? `${label}, ${time}` : label;
}

// ── Event card ────────────────────────────────────────────────────────
function EventCard({ event }: { event: PublicEvent }) {
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
        style={{ background: "rgba(15,15,22,0.9)", boxShadow: "0 2px 20px rgba(0,0,0,0.3)", willChange: "transform" }}
      >

        {/* ── Hero (≈60% of card height) ─────────────────────────────── */}
        <div
          className="relative h-[220px] shrink-0 overflow-hidden"
          style={{
            background: event.bgImage
              ? undefined
              : `linear-gradient(135deg, ${event.accent}28, ${event.accent}08)`,
          }}
        >
          {event.bgImage && (
            <img
              src={event.bgImage}
              alt={event.name}
              className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              style={{ opacity: 0.82, willChange: "transform" }}
            />
          )}

          {/* Sold-out dim */}
          {soldOut && (
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

          {/* Category pill — top left */}
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

          {/* Date stamp — top right */}
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

        {/* Seam gradient — lives on the card div (outside the hero's overflow-hidden)
            so it can freely span the hero→content boundary.
            The previous gradient was inside the hero and silently clipped.
            top:148 = 220px hero - 72px fade height, covering the last third of hero. */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{ top: 148, height: 75, background: "linear-gradient(to bottom, transparent 0%, rgba(15,15,22,1) 100%)" }}
        />

        {/* ── Content (≈40% of card height) ──────────────────────────── */}
        <div className="flex flex-col flex-1 px-4 pt-3 pb-4">

          {/* Event name */}
          <h3 className="font-heading font-bold text-[14px] leading-snug text-white line-clamp-1 truncate group-hover:text-brand-300 transition-colors mb-2">
            {event.name}
          </h3>

          {/* Venue · Date + time */}
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

          {/* Price + urgency — grow to push CTA down */}
          <div className="flex items-center gap-2 flex-1">
            {event.tiers.length > 0 && (
              <span
                className="text-[13px] font-bold"
                style={{ color: isFree ? "#55efc4" : accent }}
              >
                {isFree ? "Free" : `From ${event.currency} ${minPrice.toLocaleString()}`}
              </span>
            )}
            {!soldOut && fewLeft && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: "rgba(225,112,85,0.12)", color: "#e17055", border: "1px solid rgba(225,112,85,0.22)" }}
              >
                🔥 Few left
              </span>
            )}
            {!soldOut && sellingFast && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: "rgba(253,203,110,0.1)", color: "#fdcb6e", border: "1px solid rgba(253,203,110,0.18)" }}
              >
                ⚡ Selling fast
              </span>
            )}
          </div>

          {/* Bottom row: organizer + CTA pill */}
          <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-white/[0.06]">
            <span className="text-[10px] text-white/28 truncate">
              {event.organizer || "TicketForge"}
            </span>
            <span
              className="shrink-0 text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 group-hover:gap-2"
              style={soldOut ? {
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.22)",
                border: "1px solid rgba(255,255,255,0.08)",
              } : {
                background: `${accent}1a`,
                color: accent,
                border: `1px solid ${accent}38`,
              }}
            >
              {soldOut ? "Sold out" : <><span>Get Tickets</span><ArrowRight className="w-3 h-3" /></>}
            </span>
          </div>

        </div>
      </div>
    </Link>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────
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

// ── Empty state ───────────────────────────────────────────────────────
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

// ── Main marketplace ──────────────────────────────────────────────────
const FILTER_CATEGORIES = ["All", ...ALL_CATEGORIES];

export default function MarketplacePage() {
  const [allEvents, setAllEvents] = useState<PublicEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [category,  setCategory]  = useState("All");
  const [sortBy,    setSortBy]    = useState<"date" | "price-low" | "price-high" | "popular">("date");

  // Fetch ALL published events from the public API — no auth required.
  // This shows events from every organiser, not just the logged-in one.
  useEffect(() => {
    fetch("/api/public/events")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (Array.isArray(data)) setAllEvents(data); })
      .catch(err => console.warn("[marketplace] fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = allEvents.filter(e => {
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
    });

    if (sortBy === "date") {
      list = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === "price-low") {
      list = [...list].sort((a, b) =>
        Math.min(0, ...a.tiers.map(t => t.price)) - Math.min(0, ...b.tiers.map(t => t.price))
      );
    } else if (sortBy === "price-high") {
      list = [...list].sort((a, b) =>
        Math.max(0, ...b.tiers.map(t => t.price)) - Math.max(0, ...a.tiers.map(t => t.price))
      );
    } else if (sortBy === "popular") {
      list = [...list].sort((a, b) => b.attendeeCount - a.attendeeCount);
    }

    return list;
  }, [allEvents, query, category, sortBy]);

  const upcomingCount = allEvents.filter(e => e.date && new Date(e.date) >= new Date()).length;

  return (
    <>
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-[96px] pb-12 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(108,92,231,0.15) 0%, transparent 60%)" }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-[12px] text-brand-300 font-semibold mb-6">
              <Sparkles className="w-3 h-3" />
              {loading ? "Loading events…" : `${upcomingCount} upcoming event${upcomingCount !== 1 ? "s" : ""}`}
            </div>
            <h1 className="font-heading font-extrabold text-[44px] md:text-[60px] tracking-[-0.03em] leading-[1.05] text-white mb-4">
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

      {/* Results */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">

          {/* Results count */}
          {!loading && (
            <div className="flex items-center justify-between mb-6">
              <span className="text-[13px] text-white/35">
                {filtered.length === 0
                  ? "No events found"
                  : `${filtered.length} event${filtered.length !== 1 ? "s" : ""}${
                      query ? ` for "${query}"` : category !== "All" ? ` in ${category}` : ""
                    }`}
              </span>
              {(query || category !== "All") && (
                <button onClick={() => { setQuery(""); setCategory("All"); }}
                  className="text-[12px] text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Events grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.length === 0
                ? <EmptyMarketplace />
                : filtered.map(event => <EventCard key={event.id} event={event} />)
              }
            </div>
          )}
        </div>
      </section>

      {/* Organiser CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
            style={{
              background: "linear-gradient(135deg, rgba(108,92,231,0.12) 0%, rgba(72,52,212,0.08) 100%)",
              border: "1px solid rgba(108,92,231,0.2)",
            }}
          >
            <div>
              <h3 className="font-heading font-extrabold text-[24px] text-white mb-2">Hosting an event?</h3>
              <p className="text-[14px] text-white/45">Create your event in minutes and start selling tickets with M-Pesa today.</p>
            </div>
            <Link
              href="/auth/signup"
              className="shrink-0 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[14px] px-6 py-3 rounded-[11px] transition-all hover:scale-[1.02] whitespace-nowrap"
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
