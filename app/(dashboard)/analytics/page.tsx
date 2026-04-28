"use client";

import { useState } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { useScans } from "@/lib/hooks/useScans";
import { Card, CardHeader, CardTitle, Select, StatCard, EmptyState } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, Loader2 } from "lucide-react";

const COLORS = ["#6C5CE7","#00b894","#e17055","#0984e3","#fdcb6e","#d63031"];

export default function AnalyticsPage() {
  const { events, loading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState("");
  const { scans, loading: scansLoading } = useScans(selectedEventId || null);

  const filteredEvents = selectedEventId
    ? events.filter(e => e.id === selectedEventId)
    : events;

  const allAttendees = filteredEvents.flatMap(e => (e.attendees ?? []).map(a => ({ ...a, eventName: e.name })));

  // Hourly check-in chart
  const checkInData = Array.from({ length: 24 }, (_, h) => ({
    hour:  `${h.toString().padStart(2,"0")}:00`,
    count: allAttendees.filter(a => a.checkedIn && a.checkedInAt && new Date(a.checkedInAt).getHours() === h).length,
  }));

  // Tier breakdown
  const tierMap: Record<string, number> = {};
  allAttendees.forEach(a => { const t = a.tier || "General"; tierMap[t] = (tierMap[t] || 0) + 1; });
  const tierData = Object.entries(tierMap).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Analytics</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">Event performance overview</p>
        </div>
        <Select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-[200px]">
          <option value="">All events</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total attendees" value={allAttendees.length} />
        <StatCard label="Checked in" value={allAttendees.filter(a => a.checkedIn).length} valueClass="text-emerald-400" />
        <StatCard label="Scan events" value={scans.length} />
        <StatCard label="Events" value={filteredEvents.length} />
      </div>

      {allAttendees.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Create events and sell tickets to see analytics." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle>Check-ins by hour</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={checkInData} margin={{ left: -10 }}>
                <XAxis dataKey="hour" tick={{ fill: "#5a5a72", fontSize: 10 }} interval={3} />
                <YAxis tick={{ fill: "#5a5a72", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#6C5CE7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attendees by tier</CardTitle></CardHeader>
            {tierData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-[12px] text-white/30">No tier data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${Math.round((percent ?? 0)*100)}%`}>
                    {tierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
