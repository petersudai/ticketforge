"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDemoStore } from "@/store/useDemoStore";
import { getDemoStats } from "@/store/demoData";
import { formatDate } from "@/lib/utils";
import {
  Zap, ArrowRight, ArrowLeft, CheckCircle2, QrCode,
  Ticket, TrendingUp, Users, Calendar, MapPin, X,
  Play, BarChart3, Sparkles, CreditCard, RotateCcw,
  ChevronRight, Mail, Shield,
} from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Dashboard",    icon: BarChart3,   hint: "Here's your live dashboard with 4 real events loaded." },
  { id: 2, label: "Event",        icon: Calendar,    hint: "Events have tiers, capacity tracking, and a public registration page." },
  { id: 3, label: "Attendees",    icon: Users,       hint: "Every attendee gets a unique QR ticket. Import via CSV or add manually." },
  { id: 4, label: "M-Pesa",       icon: CreditCard,  hint: "Attendees pay with M-Pesa STK Push — ticket delivered instantly on confirm." },
  { id: 5, label: "Scanner",      icon: QrCode,      hint: "Scan QR codes at the gate. Valid ✓ / Duplicate ⚠ / Invalid ✕ — instant." },
  { id: 6, label: "Revenue",      icon: TrendingUp,  hint: "Revenue dashboard, tier breakdown, and M-Pesa transaction log." },
];

// ── Pill component ────────────────────────────────────────────────────
function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
      {text}
    </span>
  );
}

// ── Step 1: Dashboard overview ────────────────────────────────────────
function StepDashboard() {
  const { events, scans } = useDemoStore();
  const stats = getDemoStats(events);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Events", value: events.length, color: "#a29cf4" },
          { label: "Total tickets", value: stats.totalTickets.toLocaleString(), color: "#74b9ff" },
          { label: "Revenue (KES)", value: Math.round(stats.totalRevenue / 1000) + "K", color: "#55efc4" },
          { label: "Check-in rate", value: `${stats.checkinRate}%`, color: "#fdcb6e" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[10px] text-white/35 uppercase tracking-widest mb-2 font-heading">{s.label}</div>
            <div className="font-heading font-extrabold text-[24px]" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="grid grid-cols-5 px-4 py-2.5 text-[10px] text-white/30 uppercase tracking-widest font-heading" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="col-span-2">Event</div>
          <div>Date</div>
          <div>Tickets</div>
          <div>Revenue</div>
        </div>
        {events.map(e => {
          const rev = e.attendees.filter(a => a.payStatus === "paid").reduce((s, a) => s + a.pricePaid, 0);
          const upcoming = new Date(e.date) >= new Date();
          return (
            <div key={e.id} className="grid grid-cols-5 px-4 py-3 border-t border-white/[0.05] text-[12px] hover:bg-white/[0.02] transition-colors items-center">
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.accent }} />
                <span className="font-medium text-white truncate">{e.name}</span>
              </div>
              <div className="text-white/40">{formatDate(e.date)}</div>
              <div className="text-white/70">{e.attendees.length}</div>
              <div className="font-medium" style={{ color: "#55efc4" }}>
                KES {Math.round(rev / 1000)}K
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Event detail ──────────────────────────────────────────────
function StepEvent() {
  const { events } = useDemoStore();
  const event = events[0]; // Nairobi Jazz Night
  if (!event) return null;

  const sold = event.attendees.length;
  const cap  = event.capacity || 300;
  const pct  = Math.round((sold / cap) * 100);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden relative h-[140px]" style={{ background: `linear-gradient(135deg, ${event.accent}33, ${event.accent}11)` }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(10,8,24,0.95))" }} />
        <div className="absolute bottom-0 left-0 p-5 z-10">
          <div className="font-heading font-extrabold text-[20px] text-white mb-1">{event.name}</div>
          <div className="flex gap-3 text-[12px] text-white/50">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(event.date)}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}</span>
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {event.tiers.map(t => {
          const tierSold = event.attendees.filter(a => a.tier === t.name).length;
          const tierPct  = Math.round((tierSold / t.quantity) * 100);
          return (
            <div key={t.id} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                  <span className="text-[13px] font-medium text-white">{t.name}</span>
                </div>
                <span className="text-[12px] font-bold text-brand-300">
                  KES {t.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-white/35 mb-1.5">
                <span>{tierSold} sold</span>
                <span>{t.quantity - tierSold} left</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all bg-brand-500" style={{ width: `${tierPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Capacity */}
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-white/50">Overall capacity</span>
          <span className="text-white font-medium">{sold} / {cap} ({pct}%)</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: event.accent }} />
        </div>
      </div>

      {/* Public page CTA */}
      <div className="rounded-xl p-3.5 flex items-center justify-between" style={{ background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)" }}>
        <div>
          <div className="text-[12px] font-semibold text-white mb-0.5">Public event page</div>
          <div className="font-mono text-[10px] text-white/35">ticketforge.app/events/{event.slug}</div>
        </div>
        <div className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Live ●</div>
      </div>
    </div>
  );
}

// ── Step 3: Attendees ─────────────────────────────────────────────────
function StepAttendees() {
  const { events } = useDemoStore();
  const event = events[0];
  if (!event) return null;

  const attendees = event.attendees.slice(0, 8);
  const stats = {
    paid:      event.attendees.filter(a => a.payStatus === "paid").length,
    checkedIn: event.attendees.filter(a => a.checkedIn).length,
    emailed:   event.attendees.filter(a => a.emailSent).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Paid tickets", value: stats.paid, color: "#55efc4" },
          { label: "Emailed", value: stats.emailed, color: "#74b9ff" },
          { label: "Total", value: event.attendees.length, color: "#a29cf4" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3.5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="font-heading font-bold text-[20px] mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-white/35">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-2.5 text-[10px] text-white/30 uppercase tracking-widest font-heading" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div>Attendee</div><div>Tier</div><div>Payment</div><div>Ticket</div>
        </div>
        {attendees.map(a => (
          <div key={a.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-2.5 border-t border-white/[0.05] text-[12px] items-center hover:bg-white/[0.02] transition-colors">
            <div>
              <div className="font-medium text-white">{a.name}</div>
              <div className="text-[10px] text-white/30">{a.email}</div>
            </div>
            <div><Pill text={a.tier || "General"} color="#a29cf4" /></div>
            <div>
              {a.payStatus === "paid"
                ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">Paid</span>
                : a.payStatus === "free"
                ? <span className="text-[10px] font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">Free</span>
                : <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">Pending</span>
              }
            </div>
            <div className="font-mono text-[10px] text-white/30">{a.ticketId}</div>
          </div>
        ))}
        <div className="px-4 py-2.5 border-t border-white/[0.05] text-[11px] text-white/25 text-center">
          +{event.attendees.length - 8} more attendees
        </div>
      </div>
    </div>
  );
}

// ── Step 4: M-Pesa flow simulation ────────────────────────────────────
function StepMpesa() {
  const [phase, setPhase] = useState<"idle" | "initiating" | "waiting" | "paid">("idle");
  const [phone, setPhone] = useState("0712345678");

  const simulate = async () => {
    setPhase("initiating");
    await new Promise(r => setTimeout(r, 1200));
    setPhase("waiting");
    await new Promise(r => setTimeout(r, 2500));
    setPhase("paid");
  };

  return (
    <div className="space-y-4">
      {/* Event info */}
      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <div className="text-[12px] font-semibold text-white">Nairobi Jazz Night 2025</div>
          <div className="text-[11px] text-white/40 mt-0.5">VIP Tier · KICC Rooftop</div>
        </div>
        <div className="font-heading font-bold text-[18px]" style={{ color: "#fdcb6e" }}>KES 5,000</div>
      </div>

      {/* Phone input */}
      <div>
        <label className="block text-[11px] text-white/45 mb-1.5">M-Pesa phone number</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          disabled={phase !== "idle"}
          className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </div>

      {/* STK Push button */}
      {phase === "idle" && (
        <button
          onClick={simulate}
          className="w-full py-3 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          style={{ background: "#00A550" }}
        >
          <span className="text-[16px]">🔐</span>
          Pay KES 5,000 with M-Pesa
        </button>
      )}

      {/* Initiating */}
      {phase === "initiating" && (
        <div className="rounded-xl p-5 text-center" style={{ background: "rgba(0,165,80,0.07)", border: "1px solid rgba(0,165,80,0.2)" }}>
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-[13px] font-medium text-emerald-300">Connecting to Safaricom…</div>
          <div className="text-[11px] text-white/30 mt-1">Sending STK Push to {phone}</div>
        </div>
      )}

      {/* Waiting for PIN */}
      {phase === "waiting" && (
        <div className="rounded-xl p-5 text-center" style={{ background: "rgba(0,165,80,0.07)", border: "1px solid rgba(0,165,80,0.2)" }}>
          <div className="text-[32px] mb-2">📱</div>
          <div className="text-[14px] font-bold text-emerald-300 mb-1">Check your phone</div>
          <div className="text-[12px] text-white/45 mb-3">M-Pesa prompt sent to {phone}</div>
          <div className="font-mono text-[11px] text-white/25 bg-white/[0.04] rounded-lg px-3 py-2">
            Enter your M-Pesa PIN to confirm KES 5,000
          </div>
        </div>
      )}

      {/* Paid! */}
      {phase === "paid" && (
        <div className="space-y-3">
          <div className="rounded-xl p-5 text-center" style={{ background: "rgba(0,184,148,0.1)", border: "1px solid rgba(0,184,148,0.3)" }}>
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <div className="font-heading font-bold text-[18px] text-white mb-1">Payment confirmed!</div>
            <div className="text-[12px] text-white/50">M-Pesa Receipt: <span className="font-mono text-emerald-400">QK8F3PR9X2</span></div>
          </div>
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Ticket className="w-5 h-5 text-brand-400 shrink-0" />
            <div>
              <div className="text-[12px] font-medium text-white">Ticket generated</div>
              <div className="font-mono text-[11px] text-brand-400 mt-0.5">TF-VXPM-8K23RQ</div>
            </div>
            <div className="ml-auto">
              <Mail className="w-4 h-4 text-white/30" />
            </div>
          </div>
          <button onClick={() => setPhase("idle")} className="w-full py-2 text-[12px] text-white/30 hover:text-white/50 transition-colors flex items-center justify-center gap-1">
            <RotateCcw className="w-3 h-3" /> Replay simulation
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 5: Scanner ───────────────────────────────────────────────────
function StepScanner() {
  const { events, checkIn, addScan } = useDemoStore();
  const event = events[1]; // Summit — has checked-in attendees
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ type: string; name: string; tier?: string; msg: string } | null>(null);
  const [log, setLog] = useState<Array<{ result: string; name: string; time: string }>>([]);

  const verify = () => {
    if (!event || !input.trim()) return;
    const attendee = event.attendees.find(a => a.ticketId === input.trim() || a.name.toLowerCase().includes(input.toLowerCase()));
    let type: string, name: string, tier: string | undefined, msg: string;

    if (!attendee) {
      type = "invalid"; name = "Unknown ticket"; msg = `ID "${input}" not found`;
    } else if (attendee.checkedIn) {
      type = "duplicate"; name = attendee.name; tier = attendee.tier;
      msg = "Already checked in — potential duplicate";
    } else {
      checkIn(event.id, attendee.ticketId);
      type = "valid"; name = attendee.name; tier = attendee.tier;
      msg = `${tier} · Welcome, ${name.split(" ")[0]}!`;
      addScan({ id: Math.random().toString(36).slice(2), ticketId: attendee.ticketId, attendeeId: attendee.id, attendeeName: attendee.name, attendeeTier: attendee.tier, eventId: event.id, eventName: event.name, result: "valid", scannedAt: new Date().toISOString() });
    }

    setResult({ type, name, tier, msg });
    setLog(l => [{ result: type, name, time: new Date().toLocaleTimeString() }, ...l.slice(0, 4)]);
    setTimeout(() => setResult(null), 3000);
    setInput("");
  };

  // Quick-scan buttons using real attendee IDs
  const quickScan = event?.attendees.slice(0, 3) || [];

  const colors = { valid: "#00b894", invalid: "#d63031", duplicate: "#e17055" };
  const icons  = { valid: "✓", invalid: "✕", duplicate: "⚠" };

  return (
    <div className="space-y-4">
      {/* Result */}
      {result && (
        <div className="rounded-xl p-4 text-center transition-all" style={{ background: `${(colors as any)[result.type]}15`, border: `1.5px solid ${(colors as any)[result.type]}40` }}>
          <div className="text-[28px] mb-1">{(icons as any)[result.type]}</div>
          <div className="font-heading font-bold text-[16px] text-white">{result.name}</div>
          <div className="text-[12px] mt-1" style={{ color: (colors as any)[result.type] }}>{result.msg}</div>
        </div>
      )}

      {/* Manual entry */}
      <div>
        <label className="block text-[11px] text-white/45 mb-1.5">Enter ticket ID or attendee name</label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && verify()}
            placeholder="e.g. TF-ABCD-123456 or Amara"
            className="flex-1 px-3 py-2.5 rounded-xl text-[13px] text-white outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          <button
            onClick={verify}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: "#6C5CE7" }}
          >
            Verify
          </button>
        </div>
      </div>

      {/* Quick scan buttons */}
      <div>
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-heading">Quick scan demo</div>
        <div className="flex flex-col gap-2">
          {quickScan.map((a, i) => (
            <button
              key={a.id}
              onClick={() => { setInput(a.ticketId); setTimeout(verify, 50); }}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[12px] hover:bg-white/[0.04] transition-colors group"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-white/70 group-hover:text-white transition-colors">{a.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-white/25">{a.ticketId}</span>
                <ChevronRight className="w-3 h-3 text-white/20" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scan log */}
      {log.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-white/25 uppercase tracking-widest font-heading">Scan log</div>
          {log.map((l, i) => (
            <div key={i} className="flex items-center gap-3 text-[11px] py-1.5 border-b border-white/[0.04]">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: `${(colors as any)[l.result]}20`, color: (colors as any)[l.result] }}>
                {(icons as any)[l.result]}
              </div>
              <span className="flex-1 text-white/60">{l.name}</span>
              <span className="text-white/25">{l.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 6: Revenue ───────────────────────────────────────────────────
function StepRevenue() {
  const { events } = useDemoStore();
  const totalRevenue = events.reduce((s, e) =>
    s + e.attendees.filter(a => a.payStatus === "paid").reduce((r, a) => r + a.pricePaid, 0), 0
  );
  const feeAmt = totalRevenue * 0.025;
  const netPayout = totalRevenue - feeAmt;

  // Tier revenue breakdown
  const tierRevenue: Record<string, number> = {};
  events.forEach(e =>
    e.attendees.filter(a => a.payStatus === "paid").forEach(a => {
      tierRevenue[a.tier || "General"] = (tierRevenue[a.tier || "General"] || 0) + a.pricePaid;
    })
  );
  const topTiers = Object.entries(tierRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTier  = topTiers[0]?.[1] || 1;

  // Recent transactions
  const txns = events.flatMap(e =>
    e.attendees.filter(a => a.payStatus === "paid").map(a => ({
      name: a.name, tier: a.tier, amount: a.pricePaid,
      event: e.name, currency: e.currency,
    }))
  ).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Hero payout */}
      <div className="rounded-2xl p-5 flex justify-between items-start" style={{ background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(72,52,212,0.1))", border: "1px solid rgba(108,92,231,0.25)" }}>
        <div>
          <div className="text-[11px] text-white/40 mb-1">Total gross revenue</div>
          <div className="font-heading font-extrabold text-[30px] text-white tracking-tight">KES {Math.round(totalRevenue).toLocaleString()}</div>
          <div className="text-[11px] text-white/30 mt-1">All events · M-Pesa payments</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/35 mb-1">Net payout</div>
          <div className="font-heading font-bold text-[20px] text-emerald-400">KES {Math.round(netPayout).toLocaleString()}</div>
          <div className="text-[10px] text-white/30 mt-1">After 2.5% platform fee</div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[10px] text-white/30 uppercase tracking-widest font-heading">Revenue by tier</div>
        {topTiers.map(([tier, amount]) => (
          <div key={tier}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-white/70">{tier}</span>
              <span className="font-medium text-white">KES {Math.round(amount).toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round((amount / maxTier) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Transaction log */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-4 py-2.5 text-[10px] text-white/30 uppercase tracking-widest font-heading" style={{ background: "rgba(255,255,255,0.03)" }}>
          Recent M-Pesa transactions
        </div>
        {txns.map((t, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.05] text-[12px]">
            <div>
              <div className="font-medium text-white">{t.name}</div>
              <div className="text-[10px] text-white/30">{t.tier} · {t.event.slice(0, 20)}…</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#00A550] bg-[#00A550]/15 px-2 py-0.5 rounded-full">M-Pesa ✓</span>
              <span className="font-bold text-emerald-400">{t.currency} {t.amount.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step content map ──────────────────────────────────────────────────
const STEP_COMPONENTS = [StepDashboard, StepEvent, StepAttendees, StepMpesa, StepScanner, StepRevenue];

// ── Main demo page ────────────────────────────────────────────────────
export default function DemoPage() {
  const [step, setStep]   = useState(0);
  const [banner, setBanner] = useState(true);
  const { reset }         = useDemoStore();
  const StepContent       = STEP_COMPONENTS[step];
  const meta              = STEPS[step];

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#06060e" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(108,92,231,0.1) 0%, transparent 60%)" }} />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06]" style={{ background: "rgba(6,6,14,0.92)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-[54px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-[8px] bg-brand-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-heading font-bold text-[15px] text-white">TicketForge</span>
          </Link>

          {/* Step pills */}
          <div className="hidden md:flex items-center gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: i === step ? "rgba(108,92,231,0.2)" : "transparent",
                  color: i === step ? "#a29cf4" : i < step ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)",
                }}
              >
                {i < step && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={reset} className="text-[11px] text-white/25 hover:text-white/50 flex items-center gap-1 transition-colors">
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <Link
              href="/auth/signup"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: "#6C5CE7" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/[0.04]">
        <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-6">
        {/* Hint banner */}
        {banner && (
          <div className="flex items-start gap-3 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3 mb-5">
            <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-brand-300 mb-0.5">
                Step {step + 1} of {STEPS.length} — {meta.label}
              </div>
              <div className="text-[12px] text-white/50">{meta.hint}</div>
            </div>
            <button onClick={() => setBanner(false)} className="text-white/20 hover:text-white/50 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.25)" }}>
            <meta.icon className="w-4.5 h-4.5 text-brand-400" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-[20px] text-white">{meta.label}</h1>
            <div className="text-[12px] text-white/35">
              {step + 1} / {STEPS.length} · Demo data — fully interactive
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="animate-fade-in">
          <StepContent />
        </div>
      </main>

      {/* Bottom nav */}
      <div className="sticky bottom-0 border-t border-white/[0.06] z-20" style={{ background: "rgba(6,6,14,0.95)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          {/* Back */}
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all disabled:opacity-20"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          {/* Mobile step dots */}
          <div className="flex gap-1.5 md:hidden">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{ width: i === step ? 20 : 6, height: 6, background: i === step ? "#6C5CE7" : "rgba(255,255,255,0.15)" }}
              />
            ))}
          </div>

          {/* Next / CTA */}
          {isLast ? (
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(108,92,231,0.3)]"
              style={{ background: "#6C5CE7" }}
            >
              <Sparkles className="w-4 h-4" />
              Launch your real event →
            </Link>
          ) : (
            <button
              onClick={next}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: "#6C5CE7" }}
            >
              Next: {STEPS[step + 1].label} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
