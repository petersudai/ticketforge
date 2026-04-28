"use client";

import { useState } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { TicketPreview } from "@/components/shared/TicketPreview";
import { Card, CardHeader, CardTitle, Select, EmptyState } from "@/components/ui";
import { Ticket, Loader2 } from "lucide-react";

export default function TicketsPage() {
  const { events, loading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState("");

  const event = events.find(e => e.id === selectedEventId) ?? events[0] ?? null;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Tickets</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">Preview ticket design for your events</p>
        </div>
        {events.length > 0 && (
          <Select value={selectedEventId || event?.id || ""}
            onChange={e => setSelectedEventId(e.target.value)} className="w-[200px]">
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        )}
      </div>

      {!event ? (
        <EmptyState icon={Ticket} title="No events yet"
          description="Create an event first to preview its ticket design." />
      ) : (
        <Card>
          <CardHeader><CardTitle>Ticket preview — {event.name}</CardTitle></CardHeader>
          <div className="flex justify-center py-4">
            <TicketPreview
              event={event}
              attendee={{
                id: "preview", name: "Jane Kamau", email: "jane@example.com",
                ticketId: "TF-PREVIEW-0001", payStatus: "paid", pricePaid: 0,
                checkedIn: false, emailSent: false, source: "manual", eventId: event.id,
                tier: event.tiers?.[0]?.name ?? "General",
                createdAt: new Date().toISOString(),
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
