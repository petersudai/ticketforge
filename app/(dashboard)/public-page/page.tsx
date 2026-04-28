"use client";

import { useState } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { Card, CardHeader, CardTitle, Button, Select, EmptyState } from "@/components/ui";
import { Globe, ExternalLink, Loader2, AlertCircle } from "lucide-react";

export default function PublicPagePage() {
  const { events, loading, error, refetch } = useEvents();
  const [evId, setEvId] = useState<string>("");

  const event = evId ? events.find(e => e.id === evId) : events[0];

  const handleAddManual = async (name: string, email: string) => {
    if (!event) return;
    const freeTier = event.tiers.find(t => t.price === 0);
    const res = await fetch("/api/attendees", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        eventId:   event.id,
        tierId:    freeTier?.id ?? null,
        name,
        email:     email || null,
        payStatus: "free",
        pricePaid: 0,
        source:    "manual",
      }),
    });
    if (res.ok) await refetch();
  };

  if (loading) return (
    <div className="p-6 flex justify-center py-20">
      <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Public Page</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">Preview and share your event page</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="text-[13px] text-red-300">{error}</span>
        </div>
      )}

      {events.length === 0 ? (
        <Card><EmptyState icon={Globe} title="No events yet" description="Create an event first to see its public page" /></Card>
      ) : (
        <>
          <Select value={event?.id ?? ""} onChange={e => setEvId(e.target.value)} className="w-[240px]">
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>

          {event && (
            <Card>
              <CardHeader><CardTitle>Event public page</CardTitle></CardHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-[12px] text-brand-300 bg-white/[0.04] px-3 py-2 rounded-lg font-mono">
                    {typeof window !== "undefined" ? window.location.origin : ""}/events/{event.slug}
                  </code>
                  <a
                    href={`/events/${event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="secondary" size="sm">
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </Button>
                  </a>
                </div>
                <div className="text-[12px] text-white/40 space-y-1">
                  <div>Date: {event.date}{event.time ? ` · ${event.time}` : ""}</div>
                  <div>Venue: {event.venue || "—"}</div>
                  <div>Tiers: {event.tiers.filter(t => !t.hidden).length} visible</div>
                  <div>Attendees: {event.attendees.length}</div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
