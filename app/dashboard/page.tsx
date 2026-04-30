"use client";

import Link from "next/link";
import { useEvents } from "@/lib/hooks/useEvents";
import { useStore } from "@/store/useStore";
import { Card, CardTitle, CardHeader, Button, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Plus, CalendarDays, ArrowRight } from "lucide-react";
import { OnboardingBanners } from "@/components/dashboard/OnboardingBanners";

// ── Helpers ───────────────────────────────────────────────────────────

function fmtKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `KES ${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `KES ${Math.round(n).toLocaleString()}`;
}

/** Active = published & date is today or future; Past = date gone; Draft = unpublished */
function eventStatus(event: any): "Active" | "Past" | "Draft" {
  if (!event.published) return "Draft";
  const parts = (event.date as string).split("-");
  const eventDay = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDay < today ? "Past" : "Active";
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  Active: { background: "rgba(85,239,196,0.12)", color: "#55efc4", border: "1px solid rgba(85,239,196,0.22)" },
  Past:   { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" },
  Draft:  { background: "rgba(253,203,110,0.10)", color: "#fdcb6e", border: "1px solid rgba(253,203,110,0.22)" },
};

// ── Stat card — matches the homepage hero mockup exactly ──────────────

function StatCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-[10px] text-white/35 mb-2 uppercase tracking-wider font-heading">{label}</div>
      <div className="font-heading font-bold text-[20px] mb-1" style={{ color }}>{value}</div>
      <div className="text-[10px] text-white/30">{sub}</div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-[88px] bg-white/[0.04] rounded-xl" />)}
      </div>
      <div className="h-64 bg-white/[0.04] rounded-xl" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { events, loading, error } = useEvents();
  const { platformFee } = useStore();

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 text-[13px] mb-2">{error}</p>
        <p className="text-white/30 text-[12px]">Check your database connection and try refreshing.</p>
      </div>
    );
  }

  // ── Aggregate stats ───────────────────────────────────────────────

  // Primary slots only (slotIndex === 0) for ticket counts — avoids
  // double-counting expanded attendees from capacity-2+ tiers.
  // Falls back to all attendees for legacy records without slotIndex.
  const primaryAttendees = (att: any[]) =>
    att.filter(a => (a.slotIndex ?? 0) === 0);

  const totalTickets = events.reduce(
    (s, e) => s + primaryAttendees(e.attendees ?? []).length, 0,
  );
  const paidAttendees = events.flatMap(e =>
    primaryAttendees(e.attendees ?? []).filter(a => a.payStatus === "paid"),
  );
  const grossRevenue = paidAttendees.reduce(
    (s, a) => s + a.pricePaid * ((a as any).tierCapacity ?? 1), 0,
  );
  const netRevenue = grossRevenue * (1 - platformFee / 100);

  const totalCheckedIn = events.reduce(
    (s, e) => s + (e.attendees ?? []).filter(a => a.checkedIn).length, 0,
  );
  const checkInRate = totalTickets > 0
    ? Math.round((totalCheckedIn / totalTickets) * 100)
    : 0;

  // Pending pay = money owed by attendees whose status is still "pending"
  const pendingAttendees = events.flatMap(e =>
    primaryAttendees(e.attendees ?? []).filter(a => a.payStatus === "pending"),
  );
  const pendingRevenue = pendingAttendees.reduce(
    (s, a) => s + a.pricePaid * ((a as any).tierCapacity ?? 1), 0,
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <OnboardingBanners />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Dashboard</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">
            {events.length} event{events.length !== 1 ? "s" : ""} · {totalTickets} tickets sold
          </p>
        </div>
        <Link href="/events/new">
          <Button variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5" /> New event
          </Button>
        </Link>
      </div>

      {/* Stat cards — styled to match the homepage preview mockup */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total tickets"
          value={totalTickets.toLocaleString()}
          sub={`${events.length} event${events.length !== 1 ? "s" : ""}`}
          color="#a29cf4"
        />
        <StatCard
          label="Revenue (KES)"
          value={grossRevenue >= 1000
            ? `${(grossRevenue / 1000).toFixed(grossRevenue >= 10_000 ? 0 : 1)}K`
            : Math.round(grossRevenue).toLocaleString()}
          sub={`KES ${Math.round(netRevenue).toLocaleString()} net`}
          color="#55efc4"
        />
        <StatCard
          label="Checked in"
          value={totalCheckedIn.toLocaleString()}
          sub={`${checkInRate}% check-in rate`}
          color="#74b9ff"
        />
        <StatCard
          label="Pending pay"
          value={fmtKES(pendingRevenue)}
          sub={`${pendingAttendees.length} unpaid`}
          color="#fdcb6e"
        />
      </div>

      {/* Events table — matches the homepage preview mockup */}
      <Card>
        <CardHeader>
          <CardTitle>Your events</CardTitle>
          <Link href="/events/new">
            <Button variant="secondary" size="sm"><Plus className="w-3.5 h-3.5" /> Create</Button>
          </Link>
        </CardHeader>

        {events.length === 0 ? (
          <div className="py-2">
            <EmptyState icon={CalendarDays} title="No events yet"
              description="Create your first event to start selling tickets." />
            <div className="flex justify-center mt-3">
              <Link href="/events/new"><Button variant="primary" size="sm">Create event</Button></Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] text-white/30 uppercase tracking-wider border-b border-white/[0.06]"
                  style={{ fontFamily: "var(--font-heading, inherit)" }}>
                  <th className="pb-2.5 pr-4 font-semibold">Event</th>
                  <th className="pb-2.5 pr-4 font-semibold">Date</th>
                  <th className="pb-2.5 pr-4 font-semibold">Attendees</th>
                  <th className="pb-2.5 pr-4 font-semibold">Revenue</th>
                  <th className="pb-2.5 pr-4 font-semibold">Status</th>
                  <th className="pb-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {events.map(event => {
                  const att      = primaryAttendees(event.attendees ?? []);
                  const revenue  = att
                    .filter(a => a.payStatus === "paid")
                    .reduce((s: number, a: any) => s + a.pricePaid * ((a as any).tierCapacity ?? 1), 0);
                  const status   = eventStatus(event);

                  return (
                    <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 pr-4 font-medium text-white max-w-[200px]">
                        <span className="truncate block">{event.name}</span>
                      </td>
                      <td className="py-3 pr-4 text-white/40 whitespace-nowrap">
                        {formatDate(event.date)}
                      </td>
                      <td className="py-3 pr-4 text-white/60">
                        {att.length}
                      </td>
                      <td className="py-3 pr-4 font-medium text-emerald-400">
                        KES {Math.round(revenue).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={STATUS_STYLE[status]}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 text-white/20 text-right">
                        <Link
                          href={`/events/edit/${event.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/[0.06]"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
