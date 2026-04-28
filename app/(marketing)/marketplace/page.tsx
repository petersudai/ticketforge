"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";
import { formatDate } from "@/lib/utils";
import {
  Search, SlidersHorizontal, MapPin, Calendar,
  Ticket, ArrowRight, X, Sparkles, Loader2,
} from "lucide-react";

// ── Category colours ──────────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  "Music & Entertainment": { bg: "rgba(162,156,244,0.12)", text: "#a29cf4" },
  "Corporate":             { bg: "rgba(116,185,255,0.12)", text: "#74b9ff" },
  "Community & Social":    { bg: "rgba(85,239,196,0.12)",  text: "#55efc4" },
  "Sports & Fitness":      { bg: "rgba(253,203,110,0.12)", text: "#fdcb6e" },
  "Arts & Culture":        { bg: "rgba(240,153,123,0.12)", text: "#f0997b" },
  "Education":             { bg: "rgba(116,185,255,0.12)", text: "#74b9ff" },
};
function catStyle(cat?: string) {
  return CAT_COLORS[cat ?? ""] ?? { bg: "rgba(255,255,255,0.07)", text: "rgba(255,255,255,0.5)" };
}

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

// ── Event card ────────────────────────────────────────────────────────
function EventCard({ event }: { event: PublicEvent }) {
  const minPrice = event.tiers.length > 0
    ? Math.min(...event.tiers.map(t => t.price))
    : 0;
  const isFree   = minPrice === 0;
  const soldOut  = event.availabilityStatus === "sold_out";
  const fewLeft  = event.availabilityStatus === "few_left";
  const sellingFast = event.availabilityStatus === "selling_fast";
  const cs = catStyle(event.category);

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <div
        className="rounded-2xl overflow-hidden border transition-all duration-300 group-hover:border-white/[0.18] group-hover:translate-y-[-2px]"
        style={{ background: "rgba(17,17,24,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Hero */}
        <div
          className="relative h-[160px] overflow-hidden"
          style={{ background: event.bgImage ? undefined : `linear-gradient(135deg, ${event.accent}22, ${event.accent}08)` }}
        >
          {event.bgImage && (
            <img src={event.bgImage} alt={event.name}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
          )}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(17,17,24,0.95) 100%)" }} />

          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: cs.text,
                border: `1px solid ${cs.text}40`,
              }}>
              {event.category || "Event"}
            </span>
          </div>

          {soldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-[12px] font-bold text-white/60 border border-white/20 px-3 py-1 rounded-full">
                Sold out
              </span>
            </div>
          )}

          {!soldOut && event.tiers.length > 0 && (
            <div className="absolute top-3 right-3">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: isFree ? "#00b894" : event.accent }}>
                {isFree ? "Free" : `From ${event.currency} ${minPrice.toLocaleString()}`}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-heading font-bold text-[15px] text-white mb-2 leading-tight group-hover:text-brand-300 transition-colors line-clamp-2">
            {event.name}
          </h3>

          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-center gap-2 text-[12px] text-white/40">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDate(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
            </div>
            {event.venue && (
              <div className="flex items-center gap-2 text-[12px] text-white/40">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
          </div>

          {/* Tier pills */}
          {event.tiers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {event.tiers.slice(0, 3).map(t => (
                <span key={t.id}
                  className="text-[10px] px-2 py-0.5 rounded-full border text-white/50"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  {t.name} · {t.price === 0 ? "Free" : `${event.currency} ${t.price.toLocaleString()}`}
                </span>
              ))}
              {event.tiers.length > 3 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/30">
                  +{event.tiers.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Smart availability — no exact counts shown to buyers */}
          {!soldOut && (fewLeft || sellingFast) && (
            <div className="mb-3">
              {fewLeft && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                  style={{ background: "rgba(225,112,85,0.12)", color: "#e17055", border: "1px solid rgba(225,112,85,0.25)" }}>
                  🔥 Few tickets left
                </span>
              )}
              {sellingFast && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                  style={{ background: "rgba(253,203,110,0.1)", color: "#fdcb6e", border: "1px solid rgba(253,203,110,0.2)" }}>
                  ⚡ Selling fast
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/30">
              {event.organizer || "TicketForge Event"}
            </span>
            <span
              className="text-[11px] font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all"
              style={{ color: event.accent || "#6C5CE7" }}
            >
              Get tickets <ArrowRight className="w-3 h-3" />
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
    <div className="rounded-2xl overflow-hidden border border-white/[0.07] animate-pulse"
      style={{ background: "rgba(17,17,24,0.8)" }}>
      <div className="h-[160px] bg-white/[0.04]" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/[0.06] rounded w-3/4" />
        <div className="h-3 bg-white/[0.04] rounded w-1/2" />
        <div className="h-3 bg-white/[0.04] rounded w-2/3" />
        <div className="h-px bg-white/[0.06]" />
        <div className="flex justify-between">
          <div className="h-3 bg-white/[0.04] rounded w-1/4" />
          <div className="h-3 bg-white/[0.04] rounded w-1/4" />
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
const CATEGORIES = [
  "All", "Music & Entertainment", "Corporate", "Community & Social",
  "Sports & Fitness", "Arts & Culture", "Education",
];

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
        <div className="max-w-6xl mx-auto relative z-10">
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
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className="px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150"
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
        <div className="max-w-6xl mx-auto">

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Events grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
