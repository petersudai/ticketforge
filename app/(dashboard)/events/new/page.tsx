"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, Button, Input, Select, Textarea, Field } from "@/components/ui";
import { slugify, formatDate } from "@/lib/utils";
import { Plus, Trash2, Upload, Save, ChevronDown, ChevronUp } from "lucide-react";
import type { Tier } from "@/store/useStore";
import { getSupabaseClient } from "@/lib/supabase";

const COLORS = [
  { label: "Purple", value: "#6C5CE7" },
  { label: "Teal", value: "#00b894" },
  { label: "Coral", value: "#e17055" },
  { label: "Blue", value: "#0984e3" },
  { label: "Amber", value: "#fdcb6e" },
];

const CATEGORIES = [
  "Music & Entertainment", "Corporate", "Community & Social",
  "Sports & Fitness", "Arts & Culture", "Education", "Other",
];

const TIER_PRESETS = [
  { name: "Early Bird",    price: 0,    quantity: 50,  capacity: 1 },
  { name: "General",       price: 0,    quantity: 100, capacity: 1 },
  { name: "VIP",           price: 0,    quantity: 20,  capacity: 1 },
  { name: "Couple",        price: 0,    quantity: 30,  capacity: 2 },
  { name: "Group of 3",    price: 0,    quantity: 20,  capacity: 3 },
  { name: "Group of 5",    price: 0,    quantity: 10,  capacity: 5 },
  { name: "VIP Table (6)", price: 0,    quantity: 5,   capacity: 6 },
  { name: "VVIP",          price: 0,    quantity: 10,  capacity: 1 },
];

function TierRow({ tier, index, total, onChange, onRemove, onMove, currency }: {
  tier: Tier; index: number; total: number;
  onChange: (i: number, t: Tier) => void;
  onRemove: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  currency: string;
}) {
  return (
    <div className="border border-white/[0.07] rounded-xl p-3 mb-2 bg-white/[0.02]">
      <div className="grid grid-cols-[1fr_90px_70px_70px] gap-2 items-center mb-2">
        <Input
          placeholder="Tier name"
          value={tier.name}
          onChange={e => onChange(index, { ...tier, name: e.target.value })}
        />
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-white/40 pointer-events-none">{currency}</span>
          <Input
            type="number" min={0} placeholder="0"
            className="pl-9"
            value={tier.price}
            onChange={e => onChange(index, { ...tier, price: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <Input
          type="number" min={1} placeholder="Qty"
          title="Total tickets available"
          value={tier.quantity}
          onChange={e => onChange(index, { ...tier, quantity: parseInt(e.target.value) || 1 })}
        />
        <Input
          type="number" min={1} max={20} placeholder="1"
          title="People per ticket"
          value={(tier as any).capacity ?? 1}
          onChange={e => onChange(index, { ...tier, capacity: parseInt(e.target.value) || 1 } as any)}
        />
      </div>

      {/* Sale window */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Field label="Sale starts">
          <Input
            type="datetime-local"
            value={(tier as any).saleStartsAt?.slice(0, 16) ?? ""}
            onChange={e => onChange(index, { ...tier, saleStartsAt: e.target.value ? new Date(e.target.value).toISOString() : null } as any)}
          />
        </Field>
        <Field label="Sale ends">
          <Input
            type="datetime-local"
            value={(tier as any).saleEndsAt?.slice(0, 16) ?? ""}
            onChange={e => onChange(index, { ...tier, saleEndsAt: e.target.value ? new Date(e.target.value).toISOString() : null } as any)}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={(tier as any).hidden ?? false}
            onChange={e => onChange(index, { ...tier, hidden: e.target.checked } as any)}
            className="w-3.5 h-3.5 accent-brand-500"
          />
          <span className="text-[11px] text-white/50">Hidden (invite-only)</span>
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 transition-colors"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 transition-colors"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function newTier(preset?: typeof TIER_PRESETS[0]): any {
  return {
    id:           crypto.randomUUID(),
    name:         preset?.name     ?? "",
    price:        preset?.price    ?? 0,
    quantity:     preset?.quantity ?? 50,
    capacity:     preset?.capacity ?? 1,
    hidden:       false,
    sortOrder:    0,
    saleStartsAt: null,
    saleEndsAt:   null,
  };
}

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [tiers, setTiers] = useState<any[]>([newTier(TIER_PRESETS[1])]);
  const [form, setForm] = useState({
    name: "", date: "", time: "", venue: "", organizer: "",
    category: "Music & Entertainment", capacity: "", currency: "KES",
    slug: "", description: "", accent: "#6C5CE7", style: "dark",
    mpesaSc: "",
  });

  const set = (key: string, val: string) =>
    setForm(f => ({
      ...f,
      [key]: val,
      ...(key === "name" && !f.slug ? { slug: slugify(val) } : {}),
    }));

  const handleBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2 MB. Try compressing it first.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    const sb = getSupabaseClient();
    if (!sb) return;

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `event-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await sb.storage.from("event-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.warn("[new event] Image upload failed:", error.message);
      return;
    }

    const { data } = sb.storage.from("event-images").getPublicUrl(path);
    setBgImage(data.publicUrl);
  };

  const addTier = (preset?: typeof TIER_PRESETS[0]) =>
    setTiers(t => [...t, newTier(preset)]);

  const updateTier = (i: number, t: any) => setTiers(ts => ts.map((x, j) => j === i ? t : x));
  const removeTier = (i: number) => setTiers(ts => ts.length > 1 ? ts.filter((_, j) => j !== i) : ts);
  const moveTier   = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    setTiers(ts => {
      const next = [...ts];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((t, idx) => ({ ...t, sortOrder: idx }));
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/events", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          capacity:  form.capacity ? parseInt(form.capacity) : null,
          slug:      form.slug || slugify(form.name) || undefined,
          published: true,
          tiers:     tiers.map((t, i) => ({ ...t, sortOrder: i })),
          bgImage:   bgImage?.startsWith("http") ? bgImage : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to save event. Please try again.");
        setSaving(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("[new event] Save failed:", err);
      alert("Network error. Please check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-[22px] tracking-tight">New event</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">Fill in the details to create your event</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.back()}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !form.name}>
            <Save className="w-3.5 h-3.5" /> Save event
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:grid xl:grid-cols-[1fr_300px] gap-5">
        {/* Left column */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Event details</CardTitle></CardHeader>
            <Field label="Event name">
              <Input placeholder="e.g. Nairobi Jazz Night 2025" value={form.name} onChange={e => set("name", e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Date"><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></Field>
              <Field label="Time"><Input placeholder="7:00 PM" value={form.time} onChange={e => set("time", e.target.value)} /></Field>
            </div>
            <Field label="Venue"><Input placeholder="e.g. KICC, Nairobi" value={form.venue} onChange={e => set("venue", e.target.value)} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Organizer"><Input placeholder="Org name" value={form.organizer} onChange={e => set("organizer", e.target.value)} /></Field>
              <Field label="Category">
                <Select value={form.category} onChange={e => set("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Capacity"><Input type="number" placeholder="e.g. 500" value={form.capacity} onChange={e => set("capacity", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Currency">
                <Select value={form.currency} onChange={e => set("currency", e.target.value)}>
                  <option value="KES">KES — Kenyan Shilling</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="UGX">UGX — Ugandan Shilling</option>
                  <option value="TZS">TZS — Tanzanian Shilling</option>
                </Select>
              </Field>
              <Field label="Public URL slug"><Input placeholder="jazz-night-2025" value={form.slug} onChange={e => set("slug", e.target.value)} /></Field>
            </div>
            <Field label="Description">
              <Textarea placeholder="Shown on the public event page..." value={form.description} onChange={e => set("description", e.target.value)} />
            </Field>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ticket tiers</CardTitle></CardHeader>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_90px_70px_70px] gap-2 mb-1 px-3">
              {["Name", `Price (${form.currency})`, "Qty", "People / ticket"].map(h => (
                <div key={h} className="text-[10px] text-[#5a5a72] uppercase tracking-[0.06em] font-heading">{h}</div>
              ))}
            </div>

            {tiers.map((t, i) => (
              <TierRow
                key={t.id}
                tier={t}
                index={i}
                total={tiers.length}
                onChange={updateTier}
                onRemove={removeTier}
                onMove={moveTier}
                currency={form.currency}
              />
            ))}

            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={() => addTier()}>
                <Plus className="w-3.5 h-3.5" /> Add tier
              </Button>
              <div className="flex flex-wrap gap-1.5">
                {TIER_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => addTier(p)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-white/[0.08] text-white/50 hover:text-white hover:border-brand-500/40 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>M-Pesa · Daraja API</CardTitle></CardHeader>
            <Field label="Shortcode / Paybill number">
              <Input placeholder="e.g. 174379" value={form.mpesaSc} onChange={e => set("mpesaSc", e.target.value)} />
            </Field>
            <div className="bg-white/[0.03] rounded-xl p-3 text-[11px] text-[#5a5a72]">
              Full Daraja API credentials (Consumer Key, Secret, Passkey) are configured in{" "}
              <span className="text-brand-400">.env</span>. Get sandbox keys free at{" "}
              <span className="text-brand-400">developer.safaricom.co.ke</span>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Background image</CardTitle></CardHeader>
            <label className="relative block border-2 border-dashed border-white/[0.1] rounded-xl p-5 text-center cursor-pointer hover:border-brand-500/50 transition-colors group">
              <input type="file" accept="image/*" onChange={handleBg} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              {bgImage ? (
                <img src={bgImage} alt="bg" className="w-full h-20 object-cover rounded-lg" />
              ) : (
                <div>
                  <div className="w-9 h-9 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-brand-500/20 transition-colors">
                    <Upload className="w-4 h-4 text-brand-400" />
                  </div>
                  <p className="text-[12px] text-[#9898b0]"><strong className="text-[#f0f0f8]">Click to upload</strong></p>
                  <p className="text-[11px] text-[#5a5a72] mt-1">PNG, JPG up to 2 MB</p>
                </div>
              )}
            </label>
          </Card>

          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
            <Field label="Accent color">
              <Select value={form.accent} onChange={e => set("accent", e.target.value)}>
                {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Ticket style">
              <Select value={form.style} onChange={e => set("style", e.target.value)}>
                <option value="dark">Dark overlay</option>
                <option value="minimal">Minimal light</option>
                <option value="bold">Bold accent</option>
              </Select>
            </Field>
          </Card>

          {/* Mini preview */}
          <Card>
            <CardHeader><CardTitle>Ticket preview</CardTitle></CardHeader>
            <div className="rounded-xl overflow-hidden relative aspect-[1.8]" style={{ background: "#0d0b24" }}>
              {bgImage && <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
              <div className="absolute inset-0" style={{ background: "rgba(8,6,28,.84)" }} />
              <div className="relative z-10 p-3 h-full flex flex-col justify-between">
                <div>
                  <div className="font-heading font-bold text-[13px] text-white mb-1">{form.name || "Event Name"}</div>
                  <div className="text-[10px] text-white/50">{form.venue || "Venue"} · {formatDate(form.date)}</div>
                </div>
                <div className="text-[9px] text-white/30 font-mono">TF-XXXX-XXXXXX</div>
              </div>
            </div>
          </Card>

          <Button variant="primary" size="lg" className="w-full" onClick={handleSave} disabled={saving || !form.name}>
            <Save className="w-4 h-4" /> Save event
          </Button>
        </div>
      </div>
    </div>
  );
}
