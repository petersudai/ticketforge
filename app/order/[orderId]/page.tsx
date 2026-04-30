"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2, Ticket, Zap, Calendar, MapPin,
  Download, ArrowRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface OrderAttendee {
  id:          string;
  ticketId:    string;
  name:        string;
  email:       string | null;
  payStatus:   string;
  pricePaid:   number;
  checkedIn:   boolean;
  slotIndex:   number;
  maxCheckIns: number | null;
}

interface OrderEvent {
  id:        string;
  name:      string;
  slug:      string;
  date:      string;
  time:      string | null;
  endTime:   string | null;
  endDate:   string | null;
  venue:     string | null;
  organizer: string | null;
  currency:  string;
  accent:    string;
  bgImage:   string | null;
}

interface OrderTier {
  id:       string;
  name:     string;
  capacity: number;
  price:    number;
}

interface Order {
  id:                 string;
  payStatus:          string;
  totalPaid:          number;
  currency:           string;
  quantity:           number;
  ticketCount:        number;
  mpesaReceiptNumber: string | null;
  createdAt:          string;
  event:              OrderEvent;
  tier:               OrderTier;
  attendees:          OrderAttendee[];
}

// ── Helpers ───────────────────────────────────────────────────────────

// "Fri 10 May" — local constructor, no timezone drift
function fmtDay(dateStr: string): string {
  const p = dateStr.split("-");
  if (p.length < 3) return dateStr;
  const d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// "Fri 10 May 7:00 PM – Sat 12 May 4:00 AM"
function buildDateTimeRange(
  date: string,
  time?: string | null,
  endDate?: string | null,
  endTime?: string | null,
): string {
  const startDay  = fmtDay(date);
  const startFull = time ? `${startDay} ${time}` : startDay;
  const hasDiffEndDate = endDate && endDate !== date;
  if (hasDiffEndDate) {
    const endDay  = fmtDay(endDate!);
    const endFull = endTime ? `${endDay} ${endTime}` : endDay;
    return `${startFull} – ${endFull}`;
  }
  if (endTime) return `${startFull} – ${endTime}`;
  return startFull;
}

function accentMuted(hex: string, opacity = 0.12) {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, "0");
}

// ── Logo ──────────────────────────────────────────────────────────────

function LogoHeader() {
  return (
    <Link href="/" className="flex items-center gap-2 mb-10 opacity-60 hover:opacity-100 transition-opacity">
      <div className="w-7 h-7 rounded-[8px] bg-brand-500 flex items-center justify-center">
        <Zap className="w-3.5 h-3.5 text-white fill-white" />
      </div>
      <span className="font-heading font-bold text-[15px] text-white">TicketForge</span>
    </Link>
  );
}

// ── Individual ticket row ─────────────────────────────────────────────

function TicketRow({ attendee, index, accent }: { attendee: OrderAttendee; index: number; accent: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-colors"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold"
          style={{ background: accentMuted(accent, 0.15), color: accent, border: `1px solid ${accent}30` }}
        >
          {index + 1}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{attendee.name}</p>
          <p className="font-mono text-[11px] text-white/35 truncate">{attendee.ticketId}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {attendee.checkedIn && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,118,117,0.1)", color: "#ff7675", border: "1px solid rgba(255,118,117,0.2)" }}
          >
            Used
          </span>
        )}
        <Link
          href={`/ticket/${attendee.ticketId}`}
          className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
          style={{ background: accentMuted(accent, 0.1), color: accent, border: `1px solid ${accent}25` }}
        >
          <Download className="w-3 h-3" />
          View
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);

  const [order,    setOrder]    = useState<Order | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/order/${orderId}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setOrder(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [orderId]);

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────
  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#06060e] flex flex-col items-center justify-center p-6">
        <LogoHeader />
        <div className="w-full max-w-[440px] text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-heading font-bold text-[22px] text-white mb-2">Order not found</h1>
          <p className="text-[14px] text-white/45 mb-6">
            We couldn't find this order. Check your confirmation email for the correct link.
          </p>
          <Link href="/marketplace" className="text-[13px] text-brand-400 hover:text-brand-300">
            Browse events →
          </Link>
        </div>
      </div>
    );
  }

  const { event, tier, attendees } = order;
  const accent      = event.accent || "#6C5CE7";
  const isFree      = order.payStatus === "free";
  const ticketCount = attendees.length;
  const multi       = ticketCount > 1;
  const dateTimeLine = buildDateTimeRange(event.date, event.time, event.endDate, event.endTime);

  return (
    <div className="min-h-screen bg-[#06060e] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="max-w-[560px] mx-auto px-4 py-10">
        <LogoHeader />

        {/* ── Success header ─────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(0,184,148,0.12)", border: "1.5px solid rgba(0,184,148,0.4)" }}
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="font-heading font-bold text-[26px] text-white mb-2">
            {multi ? "Your tickets are confirmed!" : "You're in!"}
          </h1>
          <p className="text-[14px] text-white/50 leading-relaxed">
            {multi
              ? <><strong className="text-white">{ticketCount} tickets</strong> for <strong className="text-white">{event.name}</strong><br />are ready. Each has its own unique QR code.</>
              : <>Your ticket for <strong className="text-white">{event.name}</strong> is ready.</>
            }
          </p>
        </div>

        {/* ── Event summary card ─────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Hero strip */}
          {event.bgImage ? (
            <div className="h-[100px] relative overflow-hidden">
              <img src={event.bgImage} alt={event.name} className="w-full h-full object-cover" style={{ opacity: 0.5 }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(15,15,22,0.95) 100%)" }} />
            </div>
          ) : (
            <div
              className="h-[6px]"
              style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55)` }}
            />
          )}

          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="font-heading font-bold text-[17px] text-white leading-snug mb-0.5">{event.name}</h2>
                <span
                  className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: accentMuted(accent, 0.15), color: accent, border: `1px solid ${accent}30` }}
                >
                  {tier.name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-white/30 mb-0.5">
                  {multi ? `${ticketCount} tickets` : "1 ticket"}
                </p>
                <p className="font-heading font-bold text-[16px]" style={{ color: isFree ? "#55efc4" : accent }}>
                  {isFree ? "Free" : `${order.currency} ${order.totalPaid.toLocaleString()}`}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {event.date && (
                <div className="flex items-center gap-2 text-[12px] text-white/45">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{dateTimeLine}</span>
                </div>
              )}
              {event.venue && (
                <div className="flex items-center gap-2 text-[12px] text-white/45">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{event.venue}</span>
                </div>
              )}
            </div>

            {order.mpesaReceiptNumber && (
              <div
                className="mt-3 pt-3 border-t flex items-center justify-between text-[11px]"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                <span className="text-white/30">M-Pesa receipt</span>
                <span className="font-mono text-white/55">{order.mpesaReceiptNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tickets list ───────────────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
              Your tickets ({ticketCount})
            </p>
            {multi && (
              <p className="text-[11px] text-white/25">Each has a unique QR code</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {attendees.map((att, i) => (
              <TicketRow key={att.id} attendee={att} index={i} accent={accent} />
            ))}
          </div>
        </div>

        {/* ── Primary CTA ────────────────────────────────────────────── */}
        {ticketCount === 1 ? (
          <Link
            href={`/ticket/${attendees[0].ticketId}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-bold text-[14px] text-white mb-3 transition-all"
            style={{ background: accent }}
          >
            <Download className="w-4 h-4" />
            View & Download Ticket
          </Link>
        ) : (
          <div
            className="rounded-xl px-4 py-3.5 mb-3 flex items-start gap-3"
            style={{ background: accentMuted(accent, 0.08), border: `1px solid ${accent}20` }}
          >
            <Ticket className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} />
            <p className="text-[12px] text-white/55 leading-relaxed">
              Each ticket link above opens an individual downloadable ticket with its own QR code.
              Share them with each guest — every ticket can only be scanned once at the gate.
            </p>
          </div>
        )}

        {/* ── Email note ─────────────────────────────────────────────── */}
        <div
          className="rounded-xl px-4 py-3 mb-5 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[11px] text-white/25 leading-relaxed">
            Confirmation links have been sent to{" "}
            <span className="text-white/45">{attendees[0]?.email || "your email"}</span>.
            <br />No account required — bookmark this page or save the email.
          </p>
        </div>

        {/* ── Event link ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link href="/marketplace" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">
            ← Browse more events
          </Link>
          <Link
            href={`/events/${event.slug}`}
            className="flex items-center gap-1 text-[12px] text-white/30 hover:text-white/60 transition-colors"
          >
            Event page <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
