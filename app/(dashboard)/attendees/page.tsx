"use client";

import { useState, useRef } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { useAttendees } from "@/lib/hooks/useAttendees";
import { Card, CardHeader, CardTitle, Button, Input, Select, Field, Badge, StatCard, EmptyState } from "@/components/ui";
import { genTicketId, formatDate } from "@/lib/utils";
import { Plus, Download, Ticket, Trash2, Loader2 } from "lucide-react";
import type { Attendee } from "@/store/useStore";

function payBadge(status: string) {
  if (status === "paid") return <Badge variant="green">Paid</Badge>;
  if (status === "free") return <Badge variant="blue">Free</Badge>;
  return <Badge variant="amber">Pending</Badge>;
}

export default function AttendeesPage() {
  const { events, loading: eventsLoading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const eventId  = selectedEventId || events[0]?.id || null;
  const event    = events.find(e => e.id === eventId) ?? null;

  const { attendees, loading: attendeesLoading, refetch } = useAttendees(eventId);
  const csvRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", tier: "",
    seat: "", payStatus: "paid" as "paid" | "free" | "pending",
  });

  const currentTier = event?.tiers?.find(t => t.name === form.tier) ?? event?.tiers?.[0];

  const handleAddAttendee = async () => {
    if (!eventId || !form.name.trim()) return;

    const res = await fetch("/api/attendees", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        eventId,
        tierId:    currentTier?.id,
        name:      form.name,
        email:     form.email,
        phone:     form.phone,
        seat:      form.seat || undefined,
        payStatus: form.payStatus,
        pricePaid: form.payStatus === "paid" ? (currentTier?.price ?? 0) : 0,
        source:    "manual",
      }),
    });

    if (res.ok) {
      refetch();
      setForm(f => ({ ...f, name: "", email: "", phone: "", seat: "" }));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to add attendee");
    }
  };

  const handleDelete = async (attendeeId: string) => {
    if (!confirm("Delete this attendee? This cannot be undone.")) return;
    const res = await fetch(`/api/attendees/${attendeeId}`, { method: "DELETE" });
    if (res.ok) refetch();
    else alert("Failed to delete attendee");
  };

  const exportCSV = () => {
    if (!attendees.length) return;
    const rows = [
      ["Name","Email","Phone","Tier","Seat","Ticket ID","Payment","Price","Entries Used","Capacity"],
      ...attendees.map(a => [a.name, a.email||"", a.phone||"", a.tier||"", a.seat||"", a.ticketId, a.payStatus, a.pricePaid, (a as any).checkInCount ?? 0, (a as any).tierCapacity ?? 1]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `attendees-${eventId}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const isLoading = eventsLoading || attendeesLoading;

  if (eventsLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!event && events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState icon={Ticket} title="No events yet" description="Create an event first." />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Attendees</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">
            {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
            {event ? ` · ${event.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={eventId ?? ""}
            onChange={e => setSelectedEventId(e.target.value)} className="w-[200px]">
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Button variant="secondary" size="sm" onClick={exportCSV} disabled={!attendees.length}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const peopleAdmitted = attendees.reduce((s, a) => s + ((a as any).checkInCount ?? 0), 0);
        const ticketsIn = attendees.filter(a => ((a as any).checkInCount ?? 0) > 0).length;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={attendees.length} />
            <StatCard label="Paid" value={attendees.filter(a => a.payStatus === "paid").length} valueClass="text-emerald-400" />
            <StatCard label="Tickets in" value={ticketsIn} />
            <StatCard label="People admitted" value={peopleAdmitted} valueClass="text-emerald-400" />
          </div>
        );
      })()}

      {/* Add attendee form */}
      {event && (
        <Card>
          <CardHeader><CardTitle>Add attendee manually</CardTitle></CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Name *">
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254..." />
            </Field>
            <Field label="Tier">
              <Select value={form.tier || event.tiers?.[0]?.name || ""}
                onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
                {(event.tiers ?? []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Seat">
              <Input value={form.seat} onChange={e => setForm(f => ({ ...f, seat: e.target.value }))} placeholder="e.g. A-01" />
            </Field>
            <Field label="Payment">
              <Select value={form.payStatus} onChange={e => setForm(f => ({ ...f, payStatus: e.target.value as any }))}>
                <option value="paid">Paid</option>
                <option value="free">Free</option>
                <option value="pending">Pending</option>
              </Select>
            </Field>
          </div>
          <Button variant="primary" size="sm" onClick={handleAddAttendee} disabled={!form.name} className="mt-3">
            <Plus className="w-3.5 h-3.5" /> Add attendee
          </Button>
        </Card>
      )}

      {/* Attendee list */}
      <Card>
        <CardHeader><CardTitle>Attendee list</CardTitle></CardHeader>
        {attendeesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
        ) : attendees.length === 0 ? (
          <EmptyState icon={Ticket} title="No attendees yet"
            description="Attendees appear here after ticket purchases." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] text-white/30 uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Ticket ID</th>
                  <th className="pb-2 pr-4">Tier</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Checked in</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {attendees.map(a => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 text-white/80 font-medium">{a.name}</td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-white/40">{a.ticketId}</td>
                    <td className="py-2.5 pr-4 text-white/50">{a.tier || "—"}</td>
                    <td className="py-2.5 pr-4">{payBadge(a.payStatus)}</td>
                    <td className="py-2.5 pr-4">
                      {(() => {
                        const count = (a as any).checkInCount ?? 0;
                        const cap   = (a as any).tierCapacity ?? 1;
                        if (a.checkedIn) return <Badge variant="green">✓ {cap > 1 ? `${count}/${cap}` : "In"}</Badge>;
                        if (count > 0)   return <Badge variant="purple">{count}/{cap}</Badge>;
                        return <Badge variant="gray">—</Badge>;
                      })()}
                    </td>
                    <td className="py-2.5">
                      <button onClick={() => handleDelete(a.id)}
                        className="text-white/25 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
