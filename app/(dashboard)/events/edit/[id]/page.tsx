"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEvents } from "@/lib/hooks/useEvents";
import { useAuth } from "@/lib/auth-context";
import {
  Card, CardHeader, CardTitle, Button, Input, Select,
  Textarea, Field, Badge, StatCard, EmptyState,
} from "@/components/ui";
import { formatDate, slugify } from "@/lib/utils";
import {
  ArrowLeft, Save, Trash2, Users, Ticket, Globe,
  Plus, Eye, EyeOff, Edit2, Check, X, AlertTriangle,
  ChevronUp, ChevronDown, Copy, Link2,
} from "lucide-react";

// ── Tier row ──────────────────────────────────────────────────────────

function TierRow({
  tier, soldCount, currency, isFirst, isLast, onUpdate, onDelete, onMove, onCopyInviteLink,
}: {
  tier: any; soldCount: number; currency: string;
  isFirst: boolean; isLast: boolean;
  onUpdate: (id: string, patch: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: -1 | 1) => Promise<void>;
  onCopyInviteLink: (tierId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [form, setForm] = useState({
    name:         tier.name,
    description:  tier.description ?? "",
    price:        tier.price,
    quantity:     tier.quantity,
    capacity:     tier.capacity ?? 1,
    saleStartsAt: tier.saleStartsAt ? tier.saleStartsAt.slice(0, 16) : "",
    saleEndsAt:   tier.saleEndsAt   ? tier.saleEndsAt.slice(0, 16)   : "",
  });

  const remaining      = Math.max(0, tier.quantity - soldCount);
  const isSoldOut      = tier.quantity === 0 || (tier.quantity > 0 && remaining === 0);
  const fewLeft        = !isSoldOut && remaining > 0 && remaining <= 10;
  const peopleAdmitted = soldCount * (tier.capacity ?? 1);

  const save = async () => {
    setSaving(true);
    await onUpdate(tier.id, {
      name:         form.name,
      description:  form.description || null,
      price:        Number(form.price),
      quantity:     Number(form.quantity),
      capacity:     Number(form.capacity) || 1,
      saleStartsAt: form.saleStartsAt ? new Date(form.saleStartsAt).toISOString() : null,
      saleEndsAt:   form.saleEndsAt   ? new Date(form.saleEndsAt).toISOString()   : null,
    });
    setSaving(false); setEditing(false);
  };

  const copyLink = async () => {
    await onCopyInviteLink(tier.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = "w-full px-2.5 py-1.5 rounded-lg text-[13px] text-white bg-white/[0.06] border border-white/10 outline-none focus:border-brand-500/50";

  if (editing) {
    return (
      <div className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.2)" }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-white/40 mb-1">Tier name *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="block text-[10px] text-white/40 mb-1">Description (optional)</label>
            <input className={inputCls} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's included?" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] text-white/40 mb-1">Price ({currency})</label>
            <input type="number" min="0" className={inputCls} value={form.price}
              onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-[10px] text-white/40 mb-1">
              Qty {soldCount > 0 && <span className="text-amber-400">({soldCount} sold)</span>}
            </label>
            <input type="number" min={soldCount} className={inputCls} value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Math.max(soldCount, Number(e.target.value)) }))} />
            {soldCount > 0 && <p className="mt-0.5 text-[10px] text-white/25">Min: {soldCount} (sold)</p>}
          </div>
          <div>
            <label className="block text-[10px] text-white/40 mb-1">People per ticket</label>
            <input type="number" min="1" max="20" className={inputCls} value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, Number(e.target.value)) }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-white/40 mb-1">Sale starts</label>
            <input type="datetime-local" className={inputCls} value={form.saleStartsAt}
              onChange={e => setForm(f => ({ ...f, saleStartsAt: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] text-white/40 mb-1">Sale ends</label>
            <input type="datetime-local" className={inputCls} value={form.saleEndsAt}
              onChange={e => setForm(f => ({ ...f, saleEndsAt: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditing(false)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] text-white/50 hover:text-white hover:bg-white/[0.05] transition-all">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button onClick={save} disabled={saving || !form.name}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 transition-all">
            {saving ? "Saving…" : <><Check className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>
    );
  }

  // Sale window status label
  const now = new Date();
  let saleLabel: string | null = null;
  if (tier.saleStartsAt && new Date(tier.saleStartsAt) > now) {
    saleLabel = `Sales start ${new Date(tier.saleStartsAt).toLocaleDateString()}`;
  } else if (tier.saleEndsAt && new Date(tier.saleEndsAt) < now) {
    saleLabel = "Sales ended";
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: tier.hidden ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${tier.hidden ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.09)"}`,
        opacity: tier.hidden ? 0.65 : 1,
      }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-white">{tier.name}</span>
          {tier.hidden   && <Badge variant="gray">Hidden</Badge>}
          {isSoldOut && !tier.hidden && <Badge variant="red">Sold Out</Badge>}
          {fewLeft   && !tier.hidden && <span className="text-[10px] font-semibold text-amber-400">Few Left</span>}
          {saleLabel && <span className="text-[10px] text-white/35">{saleLabel}</span>}
        </div>
        {tier.description && <p className="text-[11px] text-white/35 mt-0.5 truncate">{tier.description}</p>}
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40 flex-wrap">
          <span>{tier.price === 0 ? "Free" : `${currency} ${Number(tier.price).toLocaleString()}`}</span>
          <span>·</span>
          <span>{soldCount}/{tier.quantity} tickets sold</span>
          {(tier.capacity ?? 1) > 1 && (
            <><span>·</span><span>{peopleAdmitted} people admitted ({tier.capacity} per ticket)</span></>
          )}
          <span>·</span>
          <span>{remaining} left</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Reorder */}
        <button onClick={() => onMove(tier.id, -1)} disabled={isFirst || saving}
          title="Move up"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 transition-all">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onMove(tier.id, 1)} disabled={isLast || saving}
          title="Move down"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 transition-all">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {/* Invite link (hidden tiers only) */}
        {tier.hidden && (
          <button onClick={copyLink}
            title={copied ? "Copied!" : "Copy invite link"}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-brand-400 hover:bg-white/[0.06] transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
          </button>
        )}
        <button onClick={async () => { setSaving(true); await onUpdate(tier.id, { hidden: !tier.hidden }); setSaving(false); }}
          disabled={saving}
          title={tier.hidden ? "Show in marketplace" : "Hide from marketplace"}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-40">
          {tier.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setEditing(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={async () => {
          if (soldCount > 0) { alert("Can't delete — tickets already sold. Hide it instead."); return; }
          if (!confirm(`Delete "${tier.name}"?`)) return;
          await onDelete(tier.id);
        }}
          title={soldCount > 0 ? "Can't delete — tickets sold. Hide instead." : "Delete"}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/[0.05] transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Add tier form ─────────────────────────────────────────────────────

const TIER_PRESETS = [
  { name: "Early Bird", capacity: 1 }, { name: "General",       capacity: 1 },
  { name: "VIP",        capacity: 1 }, { name: "Couple",        capacity: 2 },
  { name: "Group of 3", capacity: 3 }, { name: "Group of 5",    capacity: 5 },
  { name: "VIP Table",  capacity: 6 }, { name: "VVIP",          capacity: 1 },
];

function AddTierForm({ eventId, nextSort, currency, onAdded, onCancel }: {
  eventId: string; nextSort: number; currency: string;
  onAdded: (t: any) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "", description: "", price: 0, quantity: 100,
    capacity: 1, hidden: false,
    saleStartsAt: "", saleEndsAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const inputCls = "w-full px-2.5 py-1.5 rounded-lg text-[13px] text-white bg-white/[0.06] border border-white/10 outline-none focus:border-brand-500/50";

  const applyPreset = (p: typeof TIER_PRESETS[0]) =>
    setForm(f => ({ ...f, name: p.name, capacity: p.capacity }));

  const submit = async () => {
    if (!form.name.trim()) { setError("Tier name is required."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/tiers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          sortOrder:    nextSort,
          name:         form.name.trim(),
          description:  form.description || null,
          price:        Number(form.price),
          quantity:     Number(form.quantity),
          capacity:     Number(form.capacity) || 1,
          hidden:       form.hidden,
          saleStartsAt: form.saleStartsAt ? new Date(form.saleStartsAt).toISOString() : null,
          saleEndsAt:   form.saleEndsAt   ? new Date(form.saleEndsAt).toISOString()   : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed."); return; }
      onAdded(data);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.2)" }}>
      <div className="text-[11px] font-semibold text-brand-300 mb-1">New ticket tier</div>
      <div className="flex flex-wrap gap-1.5">
        {TIER_PRESETS.map(p => (
          <button key={p.name} onClick={() => applyPreset(p)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/45 hover:border-brand-500/40 hover:text-brand-300 transition-all">
            {p.name}
          </button>
        ))}
      </div>
      {error && <div className="text-[12px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-white/40 mb-1">Name *</label>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-1">Description (optional)</label>
          <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's included?" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] text-white/40 mb-1">Price ({currency})</label>
          <input type="number" min="0" className={inputCls} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-1">Quantity</label>
          <input type="number" min="1" className={inputCls} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-1">People per ticket</label>
          <input type="number" min="1" max="20" className={inputCls} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, Number(e.target.value)) }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-white/40 mb-1">Sale starts (optional)</label>
          <input type="datetime-local" className={inputCls} value={form.saleStartsAt}
            onChange={e => setForm(f => ({ ...f, saleStartsAt: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-1">Sale ends (optional)</label>
          <input type="datetime-local" className={inputCls} value={form.saleEndsAt}
            onChange={e => setForm(f => ({ ...f, saleEndsAt: e.target.value }))} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={form.hidden} onChange={e => setForm(f => ({ ...f, hidden: e.target.checked }))}
          className="w-3.5 h-3.5 accent-brand-500" />
        <span className="text-[12px] text-white/50">Hidden (invite-only) — generates a secure share link</span>
      </label>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[12px] text-white/50 hover:text-white hover:bg-white/[0.05] transition-all">Cancel</button>
        <button onClick={submit} disabled={saving || !form.name.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 transition-all">
          {saving ? "Adding…" : <><Plus className="w-3.5 h-3.5" /> Add tier</>}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const router    = useRouter();
  const { events, loading: eventsLoading, refetch } = useEvents();
  const { loading: authLoading } = useAuth();
  const event     = events.find(e => e.id === id);

  const [editing,     setEditing]     = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [tiers,   setTiers]   = useState<any[]>([]);
  const [form,    setForm]    = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (event && !form) {
      setForm({ ...event });
      setTiers(event.tiers ?? []);
    } else if (event) {
      setTiers(event.tiers ?? []);
    }
  }, [event]);

  if (authLoading || eventsLoading) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-white/[0.06] rounded" />
            <div className="h-3 w-32 bg-white/[0.04] rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/[0.04] rounded-xl" />)}
        </div>
        <div className="h-64 bg-white/[0.04] rounded-xl" />
      </div>
    );
  }

  if (!event || !form) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <EmptyState icon={Ticket} title="Event not found"
          description="This event may have been deleted or you don't have access to it." />
        <div className="flex justify-center mt-4">
          <Link href="/dashboard"><Button variant="secondary" size="sm"><ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const attended = event.attendees.filter((a: any) => a.checkedIn).length;
  const rate     = event.attendees.length ? Math.round((attended / event.attendees.length) * 100) : 0;
  const revenue  = event.attendees.filter((a: any) => a.payStatus === "paid").reduce((s: number, a: any) => s + a.pricePaid, 0);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        form.name,
          date:        form.date,
          time:        form.time || null,
          venue:       form.venue || null,
          category:    form.category || null,
          description: form.description || null,
          organizer:   form.organizer || null,
          currency:    form.currency,
          accent:      form.accent,
          published:   form.published,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Save failed");
        return;
      }
      await refetch();
      setEditing(false);
      setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      console.error("[handleSave]", err);
      alert("Network error. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event and all its data? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Delete failed");
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      alert("Network error. Please try again.");
    }
  };

  const handleTierUpdate = async (tierId: string, patch: any) => {
    // Optimistic update
    setTiers(ts => ts.map(t => t.id === tierId ? { ...t, ...patch } : t));
    try {
      const res = await fetch(`/api/tiers/${tierId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setTiers(ts => ts.map(t => t.id === tierId ? { ...t, ...updated } : t));
      } else {
        const d = await res.json().catch(() => ({}));
        console.warn("[tierUpdate]", d.error);
        // Revert optimistic update on failure
        setTiers(event.tiers ?? []);
      }
    } catch (err) {
      console.warn("[tierUpdate] network error:", err);
    }
  };

  const handleTierDelete = async (tierId: string) => {
    const prevTiers = tiers;
    setTiers(ts => ts.filter(t => t.id !== tierId));
    const res = await fetch(`/api/tiers/${tierId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) return;
    const d = await res.json().catch(() => ({}));
    setTiers(prevTiers);
    alert(d.error ?? "Delete failed.");
  };

  const handleTierMove = async (tierId: string, dir: -1 | 1) => {
    const idx = tiers.findIndex(t => t.id === tierId);
    const j   = idx + dir;
    if (j < 0 || j >= tiers.length) return;
    const next = [...tiers];
    [next[idx], next[j]] = [next[j], next[idx]];
    const withOrder = next.map((t, i) => ({ ...t, sortOrder: i }));
    setTiers(withOrder);
    // Persist both affected tiers' new sortOrders
    await Promise.all([
      handleTierUpdate(next[idx].id, { sortOrder: idx }),
      handleTierUpdate(next[j].id,   { sortOrder: j   }),
    ]);
  };

  const handleCopyInviteLink = async (tierId: string) => {
    try {
      const res = await fetch(`/api/tiers/${tierId}/invite-token`, { method: "POST" });
      if (!res.ok) { alert("Failed to generate invite link."); return; }
      const { inviteUrl } = await res.json();
      await navigator.clipboard.writeText(inviteUrl);
      // Update local tier with new token
      setTiers(ts => ts.map(t => t.id === tierId ? { ...t, inviteToken: inviteUrl.split("?tier=")[1] } : t));
    } catch {
      alert("Could not copy invite link.");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-[20px] tracking-tight truncate">{event.name}</h1>
            <p className="text-[12px] text-[#5a5a72] mt-0.5">{formatDate(event.date)}{event.time ? ` · ${event.time}` : ""} · {event.venue || "No venue"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveMsg && <span className="text-[12px] text-emerald-400">{saveMsg}</span>}
          <Link href={`/events/${event.slug}`} target="_blank">
            <Button variant="secondary" size="sm"><Globe className="w-3.5 h-3.5" /> Public page</Button>
          </Link>
          {editing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave}><Save className="w-3.5 h-3.5" /> Save</Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit event</Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Attendees" value={event.attendees.length} />
        <StatCard label="Checked in" value={`${attended} (${rate}%)`} valueClass="text-emerald-400" />
        <StatCard label={`Revenue (${event.currency})`} value={Math.round(revenue).toLocaleString()} valueClass="text-emerald-400" />
        <StatCard label="Tiers" value={tiers.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Event details */}
          <Card>
            <CardHeader><CardTitle>Event details</CardTitle></CardHeader>
            <div className="space-y-3">
              <Field label="Event name">
                {editing
                  ? <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                  : <p className="text-[13px] text-white/80">{event.name}</p>}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  {editing
                    ? <Input type="date" value={form.date ?? ""} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
                    : <p className="text-[13px] text-white/80">{formatDate(event.date)}</p>}
                </Field>
                <Field label="Time">
                  {editing
                    ? <Input value={form.time ?? ""} onChange={e => setForm((f: any) => ({ ...f, time: e.target.value }))} placeholder="7:00 PM" />
                    : <p className="text-[13px] text-white/80">{event.time || "—"}</p>}
                </Field>
              </div>
              <Field label="Venue">
                {editing
                  ? <Input value={form.venue ?? ""} onChange={e => setForm((f: any) => ({ ...f, venue: e.target.value }))} />
                  : <p className="text-[13px] text-white/80">{event.venue || "—"}</p>}
              </Field>
              <Field label="Category">
                {editing
                  ? <Input value={form.category ?? ""} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} placeholder="Music & Entertainment" />
                  : <p className="text-[13px] text-white/80">{event.category || "—"}</p>}
              </Field>
              <Field label="Description">
                {editing
                  ? <Textarea value={form.description ?? ""} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={3} />
                  : <p className="text-[13px] text-white/80 whitespace-pre-line leading-relaxed">{event.description || "No description added."}</p>}
              </Field>
            </div>
          </Card>

          {/* Ticket tiers */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket tiers</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => setShowAddTier(v => !v)}>
                <Plus className="w-3.5 h-3.5" /> Add tier
              </Button>
            </CardHeader>

            <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/25 mb-3 px-1">
              <span><EyeOff className="w-3 h-3 inline mr-0.5" /> hides from buyers</span>
              <span>·</span>
              <span>qty = 0 → Sold Out in marketplace</span>
              <span>·</span>
              <span>≤ 10 remaining → "Few Tickets Left"</span>
            </div>

            <div className="space-y-2">
              {tiers.length === 0 && !showAddTier && (
                <EmptyState icon={Ticket} title="No tiers yet" description="Add ticket tiers for buyers to choose from" />
              )}
              {tiers.map((tier, idx) => {
                const sold = event.attendees.filter((a: any) => a.tierId === tier.id).length;
                return (
                  <TierRow key={tier.id} tier={tier} soldCount={sold}
                    currency={event.currency || "KES"}
                    isFirst={idx === 0} isLast={idx === tiers.length - 1}
                    onUpdate={handleTierUpdate} onDelete={handleTierDelete}
                    onMove={handleTierMove} onCopyInviteLink={handleCopyInviteLink} />
                );
              })}
              {showAddTier && (
                <AddTierForm
                  eventId={event.id}
                  nextSort={tiers.length} currency={event.currency || "KES"}
                  onAdded={tier => { setTiers(ts => [...ts, tier]); setShowAddTier(false); }}
                  onCancel={() => setShowAddTier(false)} />
              )}
            </div>
          </Card>
        </div>

        {/* Right column — attendees */}
        <div>
          <Card>
            <CardHeader><CardTitle>Attendees ({event.attendees.length})</CardTitle></CardHeader>
            {event.attendees.length === 0 ? (
              <EmptyState icon={Users} title="No attendees yet" description="Share your event link to start selling" />
            ) : (
              <div className="space-y-0 max-h-[420px] overflow-y-auto">
                {event.attendees.slice(0, 50).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 py-2.5 border-b border-white/[0.05] last:border-0">
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-[10px] text-brand-400 font-bold shrink-0">
                      {a.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-white truncate">{a.name}</div>
                      <div className="text-[10px] text-white/35 truncate">{a.email || a.phone || "—"}</div>
                    </div>
                    <Badge variant={a.checkedIn ? "green" : a.payStatus === "paid" ? "purple" : "gray"}>
                      {a.checkedIn ? "In" : a.payStatus}
                    </Badge>
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
