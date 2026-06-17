import Link from "next/link";
import Image from "next/image";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

/**
 * components/marketing/EventMiniCard.tsx
 *
 * Compact, clickable event card. Single source used by:
 *   • DiscoverEvents (landing page "get discovered" strip)
 *   • Similar events on the public event page
 *
 * Deliberately lighter than the marketplace's full EventCard (which is
 * 390px tall and tied to marketplace-local helpers). This one is a small
 * teaser tile that links through to the full event page.
 *
 * Accepts a loose shape so it can consume either the public list API
 * (/api/public/events) or the single-event API without coupling.
 */

export interface MiniEvent {
  id:        string;
  name:      string;
  slug:      string;
  date:      string;
  time?:     string | null;
  venue?:    string | null;
  category?: string | null;
  currency?: string | null;
  accent?:   string | null;
  bgImage?:  string | null;
  tiers?:    { price: number }[];
}

function fromPriceLabel(ev: MiniEvent): string {
  const tiers = ev.tiers ?? [];
  if (tiers.length === 0) return "";
  const min = Math.min(...tiers.map(t => t.price ?? 0));
  if (min <= 0) return "Free";
  return `From ${ev.currency ?? "KES"} ${min.toLocaleString()}`;
}

export function EventMiniCard({ event }: { event: MiniEvent }) {
  const accent = event.accent ?? "#6C5CE7";
  const price  = fromPriceLabel(event);

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <div
        className="rounded-2xl overflow-hidden border border-white/[0.07] transition-all duration-300 group-hover:border-white/[0.18] group-hover:-translate-y-[2px] h-full flex flex-col"
        style={{ background: "rgba(15,15,22,0.9)" }}
      >
        {/* Cover */}
        <div
          className="relative h-[130px] shrink-0 overflow-hidden"
          style={{ background: event.bgImage ? undefined : `linear-gradient(135deg, ${accent}28, ${accent}08)` }}
        >
          {event.bgImage && (
            <Image
              src={event.bgImage}
              alt={event.name}
              fill
              sizes="(min-width: 900px) 25vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={{ opacity: 0.82 }}
            />
          )}
          {event.category && (
            <div className="absolute top-2.5 left-2.5">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full leading-none"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {event.category}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 px-3.5 pt-3 pb-3.5">
          <h3 className="font-heading font-bold text-[13px] leading-snug text-white truncate group-hover:text-brand-300 transition-colors mb-1.5">
            {event.name}
          </h3>
          <div className="flex flex-col gap-1 mb-3">
            {event.date && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/55">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="truncate">{formatDate(event.date)}{event.time ? `, ${event.time}` : ""}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/55">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-auto pt-2.5 border-t border-white/[0.06]">
            <span className="text-[12px] font-bold" style={{ color: price === "Free" ? "#55efc4" : accent }}>
              {price}
            </span>
            <span
              className="shrink-0 text-[11px] font-semibold flex items-center gap-1 transition-all group-hover:gap-1.5"
              style={{ color: accent }}
            >
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
