"use client";

import { useState } from "react";
import Link from "next/link";
import { useEvents } from "@/lib/hooks/useEvents";
import { useStore } from "@/store/useStore";
import { Card, CardHeader, CardTitle, Button, Select, Badge, StatCard } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, TrendingUp, Lock, ArrowRight, Loader2 } from "lucide-react";

const COLORS = ["#6C5CE7","#00b894","#e17055","#0984e3","#fdcb6e","#d63031"];

function PayoutLockBanner() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl mb-6"
      style={{ background: "rgba(225,112,85,0.08)", border: "1px solid rgba(225,112,85,0.25)" }}>
      <div className="w-10 h-10 rounded-xl bg-[#e17055]/15 flex items-center justify-center shrink-0">
        <Lock className="w-5 h-5 text-[#e17055]" />
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-white">Payouts are locked</div>
        <div className="text-[11px] text-white/45 mt-0.5">
          Add your M-Pesa Paybill or Till number in Settings to unlock revenue withdrawals.
        </div>
      </div>
      <Link href="/settings"
        className="shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
        style={{ background: "rgba(225,112,85,0.15)", color: "#e17055", border: "1px solid rgba(225,112,85,0.3)" }}>
        Set up payouts <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export default function RevenuePage() {
  const { events, loading } = useEvents();
  const { platformFee }     = useStore();
  const [selectedEventId, setSelectedEventId] = useState("");

  const filteredEvents = selectedEventId ? events.filter(e => e.id === selectedEventId) : events;
  const allAttendees   = filteredEvents.flatMap(e =>
    (e.attendees ?? []).map(a => ({ ...a, eventName: e.name, curr: e.currency || "KES" }))
  );
  const paid    = allAttendees.filter(a => a.payStatus === "paid");
  const free    = allAttendees.filter(a => a.payStatus === "free");
  const pending = allAttendees.filter(a => a.payStatus === "pending");
  const gross   = paid.reduce((s, a) => s + a.pricePaid, 0);
  const net     = gross * (1 - platformFee / 100);

  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString("default", { month: "short" });
    const rev   = paid
      .filter(a => new Date(a.createdAt).getMonth() === d.getMonth() && new Date(a.createdAt).getFullYear() === d.getFullYear())
      .reduce((s, a) => s + a.pricePaid, 0);
    return { month: label, revenue: rev };
  });

  const tierRevenue: Record<string, number> = {};
  paid.forEach(a => { const t = a.tier || "General"; tierRevenue[t] = (tierRevenue[t] || 0) + a.pricePaid; });
  const pieData = Object.entries(tierRevenue).map(([name, value]) => ({ name, value }));

  const exportCSV = () => {
    const rows = [
      ["Name","Email","Phone","Event","Tier","Ticket ID","Status","Amount","Date"],
      ...allAttendees.map(a => [a.name, a.email||"", a.phone||"", a.eventName, a.tier||"", a.ticketId, a.payStatus, a.pricePaid, a.createdAt]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `revenue-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-5">
      <PayoutLockBanner />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Revenue</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">Financial overview & M-Pesa transactions</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-[180px]">
            <option value="">All events</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Gross revenue" value={`KES ${Math.round(gross).toLocaleString()}`} valueClass="text-emerald-400" />
        <StatCard label={`Net (after ${platformFee}% fee)`} value={`KES ${Math.round(net).toLocaleString()}`} valueClass="text-emerald-400" />
        <StatCard label="Paid tickets" value={paid.length} />
        <StatCard label="Pending" value={pending.length} valueClass="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle>Revenue (last 6 months)</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData} margin={{ left: -10 }}>
              <XAxis dataKey="month" tick={{ fill: "#5a5a72", fontSize: 11 }} />
              <YAxis tick={{ fill: "#5a5a72", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#6C5CE7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by tier</CardTitle></CardHeader>
          {pieData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-[12px] text-white/30">No paid tickets yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Transaction list */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({allAttendees.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] text-white/30 uppercase tracking-wider border-b border-white/[0.06]">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Event</th>
                <th className="pb-2 pr-4">Tier</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {allAttendees.slice(0, 50).map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pr-4 text-white/80">{a.name}</td>
                  <td className="py-2.5 pr-4 text-white/50 truncate max-w-[140px]">{a.eventName}</td>
                  <td className="py-2.5 pr-4 text-white/50">{a.tier || "—"}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={a.payStatus === "paid" ? "green" : a.payStatus === "free" ? "blue" : "amber"}>
                      {a.payStatus}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-emerald-400">
                    {a.pricePaid > 0 ? `${a.curr} ${a.pricePaid.toLocaleString()}` : "Free"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allAttendees.length > 50 && (
            <p className="text-[11px] text-white/25 text-center py-3">
              Showing 50 of {allAttendees.length}. Export CSV for full list.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
