"use client";

import Link from "next/link";
import { useEvents } from "@/lib/hooks/useEvents";
import { useStore } from "@/store/useStore";
import { StatCard, Card, CardTitle, CardHeader, Button, Badge, EmptyState } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, CalendarDays, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { OnboardingBanners } from "@/components/dashboard/OnboardingBanners";

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/[0.04] rounded-xl" />)}
      </div>
      <div className="h-64 bg-white/[0.04] rounded-xl" />
    </div>
  );
}

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

  const totalTickets    = events.reduce((s, e) => s + (e.attendees?.length ?? 0), 0);
  const totalRevenue    = events.reduce((s, e) =>
    s + (e.attendees ?? []).filter(a => a.payStatus === "paid").reduce((r, a) => r + a.pricePaid, 0), 0);
  const totalCheckedIn  = events.reduce((s, e) => s + (e.attendees ?? []).filter(a => a.checkedIn).length, 0);
  const totalEmailsSent = events.reduce((s, e) => s + (e.attendees ?? []).filter(a => a.emailSent).length, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <OnboardingBanners />

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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total tickets" value={totalTickets} />
        <StatCard label="Revenue (KES)" value={formatCurrency(totalRevenue)} valueClass="text-emerald-400" />
        <StatCard label="Checked in"   value={totalCheckedIn} />
        <StatCard label="Emails sent"  value={totalEmailsSent} />
      </div>

      {/* Events */}
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
          <div className="divide-y divide-white/[0.05]">
            {events.map(event => {
              const sold     = event.attendees?.length ?? 0;
              const revenue  = (event.attendees ?? []).filter(a => a.payStatus === "paid").reduce((s, a) => s + a.pricePaid, 0);
              const checkedIn = (event.attendees ?? []).filter(a => a.checkedIn).length;

              return (
                <div key={event.id} className="flex items-center gap-4 py-3 group">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${event.accent}18` }}
                  >
                    <CalendarDays className="w-5 h-5" style={{ color: event.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-white truncate">{event.name}</div>
                    <div className="text-[11px] text-[#5a5a72] mt-0.5">
                      {formatDate(event.date)}{event.venue ? ` · ${event.venue}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-[12px] font-semibold text-white">{sold} sold</div>
                    <div className="text-[11px] text-emerald-400">KES {revenue.toLocaleString()}</div>
                  </div>
                  <Badge variant={checkedIn > 0 ? "green" : "gray"}>
                    {checkedIn}/{sold} in
                  </Badge>
                  <Link href={`/events/edit/${event.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon"><ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
