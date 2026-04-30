"use client";

import { useState } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { Card, CardHeader, CardTitle, Button, Input, Select, Textarea, Field, Badge, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Send, Eye } from "lucide-react";

export default function EmailPage() {
  const { events, refetch } = useEvents();
  const [evId, setEvId] = useState("");
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("Your ticket for {{event}} is ready!");
  const [message, setMessage] = useState("");
  const [ejsService, setEjsService] = useState("");
  const [ejsTemplate, setEjsTemplate] = useState("");
  const [ejsKey, setEjsKey] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sendLog, setSendLog] = useState<{ event: string; count: number; time: string; mode: string }[]>([]);

  const event = events.find(e => e.id === evId);

  const getTargets = () => {
    if (!event) return [];
    // Filter to primary slots only (slotIndex === 0) so capacity-expanded attendees
    // (e.g. the 2nd entry from a Couple ticket) don't generate duplicate emails
    // to the same buyer. Legacy records without slotIndex are treated as primary.
    let targets = event.attendees.filter(a => a.ticketId && a.email && ((a as any).slotIndex ?? 0) === 0);
    if (audience === "unsent") targets = targets.filter(a => !a.emailSent);
    if (audience === "vip") targets = targets.filter(a => (a.tier || "").toLowerCase().includes("vip"));
    if (audience === "unpaid") targets = targets.filter(a => a.payStatus === "pending");
    return targets;
  };

  const handleSend = async () => {
    const targets = getTargets();
    if (!targets.length) { alert("No eligible attendees with email addresses"); return; }

    // Mark emailSent=true via API for each attendee
    await Promise.allSettled(
      targets.map(a =>
        fetch(`/api/attendees/${a.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ emailSent: true }),
        })
      )
    );
    await refetch();

    setSendLog(l => [{
      event: event?.name || "",
      count: targets.length,
      time:  new Date().toLocaleTimeString(),
      mode:  ejsService ? "EmailJS" : "Simulated",
    }, ...l]);
    alert(!ejsService
      ? `Simulated sending to ${targets.length} attendees.\nAdd EmailJS credentials above for real delivery.`
      : `Sending to ${targets.length} attendees via EmailJS…`
    );
  };

  // Count primary slots only to avoid double-counting expanded attendees
  const primaryAttendees = event?.attendees.filter(a => ((a as any).slotIndex ?? 0) === 0) ?? [];
  const sent    = primaryAttendees.filter(a => a.emailSent).length;
  const pending = primaryAttendees.filter(a => !a.emailSent && a.email).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Email</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">Send tickets and notifications to attendees</p>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>EmailJS configuration</CardTitle></CardHeader>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Service ID"><Input placeholder="service_xxxxxxx" value={ejsService} onChange={e => setEjsService(e.target.value)} /></Field>
              <Field label="Template ID"><Input placeholder="template_xxxxxxx" value={ejsTemplate} onChange={e => setEjsTemplate(e.target.value)} /></Field>
              <Field label="Public Key"><Input type="password" placeholder="Your public key" value={ejsKey} onChange={e => setEjsKey(e.target.value)} /></Field>
            </div>
            <div className="text-[11px] text-[#5a5a72]">Free at <span className="text-brand-400">emailjs.com</span> · 200 emails/month free · Without keys, simulation mode is used</div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Compose & send</CardTitle></CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Field label="Event">
                <Select value={evId} onChange={e => setEvId(e.target.value)}>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </Field>
              <Field label="Audience">
                <Select value={audience} onChange={e => setAudience(e.target.value)}>
                  <option value="all">All attendees</option>
                  <option value="unsent">Unsent only</option>
                  <option value="vip">VIP tier only</option>
                  <option value="unpaid">Unpaid reminder</option>
                </Select>
              </Field>
            </div>
            <Field label="Subject line">
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </Field>
            <Field label="Custom message (optional)">
              <Textarea placeholder="Add a personal note to attendees..." value={message} onChange={e => setMessage(e.target.value)} />
            </Field>
            <div className="flex items-center gap-3 mt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="w-3.5 h-3.5" /> {showPreview ? "Hide" : "Preview"} email
              </Button>
              <span className="text-[11px] text-[#5a5a72] flex-1">{getTargets().length} recipients selected</span>
              <Button variant="primary" size="sm" onClick={handleSend}>
                <Send className="w-3.5 h-3.5" /> Send tickets
              </Button>
            </div>
          </Card>

          {showPreview && event && (
            <Card>
              <CardHeader><CardTitle>Email preview</CardTitle></CardHeader>
              <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                <div className="bg-[#18181f] px-4 py-2.5 text-[11px] text-[#9898b0]">
                  Subject: <strong className="text-[#f0f0f8]">{subject.replace("{{event}}", event.name)}</strong>
                </div>
                <div className="bg-white p-5">
                  <div className="h-1 rounded mb-4" style={{ background: event.accent }} />
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Your ticket is ready!</h2>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>Hi <strong style={{ color: "#1a1a2e" }}>[Attendee Name]</strong>,</p>
                  <p style={{ fontSize: 13, color: "#333", marginBottom: 12 }}>You're registered for <strong>{event.name}</strong>.</p>
                  <div style={{ background: "#f8f8fc", borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[["Date", formatDate(event.date)], ["Time", event.time || "—"], ["Venue", event.venue || "—"], ["Organizer", event.organizer || "—"]].map(([l, v]) => (
                      <div key={l}><div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{l}</div><div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a2e" }}>{v}</div></div>
                    ))}
                  </div>
                  {message && <p style={{ fontSize: 12, color: "#666", fontStyle: "italic", borderLeft: `3px solid ${event.accent}`, paddingLeft: 10, marginBottom: 14 }}>{message}</p>}
                  <div style={{ background: event.accent, color: "#fff", padding: "10px 16px", borderRadius: 8, textAlign: "center", fontWeight: 600, marginBottom: 14 }}>View & Download Your Ticket →</div>
                  <p style={{ fontSize: 10, color: "#aaa", textAlign: "center" }}>Your unique QR code and ticket ID are attached. Present at the gate for entry.</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Sent" value={sent} valueClass="text-emerald-400" />
            <StatCard label="Pending" value={pending} valueClass="text-amber-400" />
          </div>

          <Card>
            <CardHeader><CardTitle>Send log</CardTitle></CardHeader>
            {sendLog.length === 0 ? (
              <p className="text-[11px] text-[#5a5a72]">No emails sent yet</p>
            ) : (
              <div className="space-y-2">
                {sendLog.map((l, i) => (
                  <div key={i} className="pb-2 border-b border-white/[0.06] last:border-0">
                    <div className="text-[12px] font-medium">{l.event}</div>
                    <div className="text-[10px] text-[#5a5a72] mt-0.5">{l.time} · {l.count} recipients · {l.mode}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
