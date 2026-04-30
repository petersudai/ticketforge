"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useEvents } from "@/lib/hooks/useEvents";
import { Card, CardHeader, CardTitle, Button, Input, Field } from "@/components/ui";
import { Save, Database, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { platformFee } = useStore();
  const { events, loading: eventsLoading } = useEvents();

  const [pin,       setPin]       = useState("");
  const [saved,     setSaved]     = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError,  setPinError]  = useState("");

  const totalAttendees = events.reduce((s, e) => s + (e.attendees?.length ?? 0), 0);

  const handleSavePin = async () => {
    if (pin.length < 4) { setPinError("PIN must be at least 4 digits"); return; }
    if (!/^\d+$/.test(pin)) { setPinError("PIN must be numeric"); return; }
    setPinSaving(true);
    setPinError("");
    try {
      const res = await fetch("/api/settings/pin", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin }),
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPinError(d.error ?? "Failed to save PIN");
      } else {
        setPin("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setPinError("Network error");
    } finally {
      setPinSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in space-y-5">
      <div>
        <h1 className="font-heading font-bold text-[22px] tracking-tight">Settings</h1>
        <p className="text-[12px] text-[#5a5a72] mt-1">Platform configuration</p>
      </div>

      {/* Scanner PIN */}
      <Card>
        <CardHeader><CardTitle>Scanner override PIN</CardTitle></CardHeader>
        <div className="space-y-3">
          <Field label="New override PIN">
            <Input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter new PIN (digits only)"
              maxLength={12}
            />
          </Field>
          <p className="text-[11px] text-white/35">4–12 digits. Used by gate staff to manually override a failed scan. Stored securely on the server.</p>
          {pinError && <p className="text-[11px] text-red-400">{pinError}</p>}
          <Button variant="primary" onClick={handleSavePin} disabled={pinSaving || pin.length < 4}>
            {pinSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {pinSaving ? "Saving…" : "Update PIN"}
          </Button>
        </div>
      </Card>

      {/* Platform fee — read-only for organisers */}
      <Card>
        <CardHeader><CardTitle>Platform fee</CardTitle></CardHeader>
        <div className="flex items-center justify-between py-1">
          <p className="text-[13px] text-white/60">Applied to gross revenue from ticket sales</p>
          <span className="text-[18px] font-bold text-white">{platformFee}%</span>
        </div>
        <p className="text-[11px] text-white/25 mt-2">
          Platform fee is set by TicketForge and cannot be changed by organisers.
          Contact support if you have questions about your fee rate.
        </p>
      </Card>

      {/* DB summary */}
      <Card>
        <CardHeader>
          <CardTitle>Database summary</CardTitle>
          {eventsLoading && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
        </CardHeader>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Events",    value: events.length },
            { label: "Attendees", value: totalAttendees },
            { label: "Tiers",     value: events.reduce((s, e) => s + (e.tiers?.length ?? 0), 0) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center py-3 px-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[22px] font-bold text-white">{value}</div>
              <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/25 mt-3">
          All data is stored in Supabase Postgres. To export, use the Revenue page CSV export.
        </p>
      </Card>

      {saved && <span className="text-[12px] text-emerald-400">Saved ✓</span>}
    </div>
  );
}
