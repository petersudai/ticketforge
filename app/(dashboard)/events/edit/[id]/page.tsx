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
import { CATEGORIES, normalizeCategory } from "@/lib/constants/categories";
import { getSupabaseClient } from "@/lib/supabase";
import {
  ArrowLeft, Save, Trash2, Users, Ticket, Globe,
  Plus, Eye, EyeOff, Edit2, Check, X, AlertTriangle,
  ChevronUp, ChevronDown, Copy, Link2, ImagePlus, XCircle,
  Loader2, FileText,
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
  const { loading: authLoading, role: userRole } = useAuth();
  const event     = events.find(e => e.id === id);

  const [showAddTier,   setShowAddTier]   = useState(false);
  const [tiers,         setTiers]         = useState<any[]>([]);
  const [form,          setForm]          = useState<any>(null);
  const [saving,        setSaving]        = useState<"" | "save" | "draft" | "publish">("");
  const [saveMsg,       setSaveMsg]       = useState("");
  const [bgUploading,   setBgUploading]   = useState(false);

  useEffect(() => {
    if (event && !form) {
      setForm({
        ...event,
        // Normalise free-text categories created before the dropdown was enforced
        category: normalizeCategory(event.category),
        bgImage:  event.bgImage ?? null,
      });
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

  // Multi-use check-in stats
  // ticketsIn  = attendees that have been scanned at least once
  // peopleIn   = sum of all checkInCount values (actual humans admitted)
  // maxPeople  = sum of all tier capacities for paid tickets (expected max admissions)
  const paidAttendees  = event.attendees.filter((a: any) => a.payStatus === "paid");
  const ticketsIn      = event.attendees.filter((a: any) => (a.checkInCount ?? 0) > 0).length;
  const peopleIn       = event.attendees.reduce((s: number, a: any) => s + (a.checkInCount ?? 0), 0);
  const maxPeople      = paidAttendees.reduce((s: number, a: any) => s + (a.tierCapacity ?? 1), 0);
  const attended       = event.attendees.filter((a: any) => a.checkedIn).length; // fully redeemed tickets
  const rate           = maxPeople > 0 ? Math.round((peopleIn / maxPeople) * 100) : 0;
  const revenue        = paidAttendees.reduce((s: number, a: any) => s + a.pricePaid, 0);

  const buildPayload = (overrides?: object) => ({
    name:        form.name,
    date:        form.date,
    time:        form.time || null,
    endTime:     form.endTime || null,
    endDate:     form.endDate || null,
    venue:       form.venue || null,
    category:    form.category || null,
    description: form.description || null,
    organizer:   form.organizer || null,
    currency:    form.currency,
    accent:      form.accent,
    published:   form.published,
    bgImage:     form.bgImage ?? null,
    ...overrides,
  });

  const doSave = async (payload: object, mode: "save" | "draft" | "publish") => {
    setSaving(mode);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Save failed");
        return;
      }
      await refetch();
      setSaveMsg("Saved ✓"); setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      console.error("[save]", err);
      alert("Network error. Please try again.");
    } finally {
      setSaving("");
    }
  };

  const handleSave          = () => doSave(buildPayload(), "save");
  const handleSaveDraft     = () => doSave(buildPayload({ published: false }), "draft");
  const handleTogglePublish = () => {
    const next = !form.published;
    setForm((f: any) => ({ ...f, published: next }));
    doSave(buildPayload({ published: next }), "publish");
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

  const handleUndoCheckIn = async (attendeeId: string, attendeeName: string) => {
    const reason = prompt(`Undo check-in for ${attendeeName}?\n\nOptional reason (or leave blank):`);
    if (reason === null) return; // user cancelled
    try {
      const res = await fetch(`/api/attendees/${attendeeId}/undo-checkin`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason: reason.trim() || undefined }),
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Undo failed");
        return;
      }
      await refetch();
    } catch {
      alert("Network error. Please try again.");
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2 MB. Try compressing it first.");
      e.target.value = "";
      return;
    }

    setBgUploading(true);
    // Optimistic local preview while uploading
    const reader = new FileReader();
    reader.onload = ev => setForm((f: any) => ({ ...f, bgImage: ev.target?.result as string }));
    reader.readAsDataURL(file);

    const sb = getSupabaseClient();
    if (!sb) { setBgUploading(false); return; }

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `event-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await sb.storage.from("event-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.warn("[edit event] Image upload failed:", error.message);
      alert("Image upload failed. Please try again.");
      setBgUploading(false);
      return;
    }

    const { data } = sb.storage.from("event-images").getPublicUrl(path);
    setForm((f: any) => ({ ...f, bgImage: data.publicUrl }));
    setBgUploading(false);
  };

  const handleBgRemove = () => {
    setForm((f: any) => ({ ...f, bgImage: null }));
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
    <div>

      {/* ── Sticky Save Bar ──────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-white/[0.07]"
        style={{ background: "rgba(8,8,20,0.93)", backdropFilter: "blur(20px)" }}
      >
        {/* Left — back + name + live status dot */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-white leading-tight truncate max-w-[180px] md:max-w-xs">
              {form.name || "Untitled event"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${form.published ? "bg-emerald-400" : "bg-white/25"}`} />
              <span className="text-[11px] text-white/40">{form.published ? "Published" : "Draft"}</span>
            </div>
          </div>
        </div>

        {/* Right — action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveMsg && <span className="text-[12px] text-emerald-400 hidden sm:inline">{saveMsg}</span>}

          {/* Preview */}
          <Link href={`/events/${event.slug}`} target="_blank">
            <Button variant="ghost" size="sm">
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Preview</span>
            </Button>
          </Link>

          {/* Save Draft */}
          <Button variant="secondary" size="sm" onClick={handleSaveDraft} disabled={!!saving}>
            {saving === "draft"
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FileText className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Save Draft</span>
          </Button>

          {/* Publish / Unpublish */}
          <Button
            variant="secondary" size="sm"
            onClick={handleTogglePublish}
            disabled={!!saving}
            style={form.published
              ? { color: "#fdcb6e", borderColor: "rgba(253,203,110,0.25)" }
              : { color: "#55efc4", borderColor: "rgba(85,239,196,0.25)" }}
          >
            {saving === "publish"
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : form.published
                ? <EyeOff className="w-3.5 h-3.5" />
                : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{form.published ? "Unpublish" : "Publish"}</span>
          </Button>

          {/* Save Changes */}
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!!saving}>
            {saving === "save"
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Tickets sold"                  value={paidAttendees.length} />
          <StatCard label="Tickets in"                    value={ticketsIn} />
          <StatCard label={`People admitted (${rate}%)`}  value={peopleIn}  valueClass="text-emerald-400" />
          <StatCard label={`Revenue (${event.currency})`} value={Math.round(revenue).toLocaleString()} valueClass="text-emerald-400" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left column (2/3) ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* ① Ticket Tiers — top priority */}
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

            {/* ② Event Details — middle */}
            <Card>
              <CardHeader><CardTitle>Event details</CardTitle></CardHeader>
              <div className="space-y-4">

                {/* Visibility toggle — prominent, at top of section */}
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer select-none transition-all"
                  style={form.published
                    ? { background: "rgba(85,239,196,0.06)", border: "1px solid rgba(85,239,196,0.2)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onClick={() => setForm((f: any) => ({ ...f, published: !f.published }))}
                >
                  <div>
                    <p className={`text-[13px] font-semibold ${form.published ? "text-emerald-400" : "text-white/55"}`}>
                      {form.published ? "Published — visible to public" : "Draft — hidden from marketplace"}
                    </p>
                    <p className="text-[11px] text-white/35 mt-0.5">
                      {form.published
                        ? "Buyers can find and purchase tickets on the marketplace"
                        : "Save changes privately before you're ready to go live"}
                    </p>
                  </div>
                  {/* Toggle pill */}
                  <div className={`relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 ml-4 ${
                    form.published ? "bg-emerald-500/70" : "bg-white/15"
                  }`}>
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      form.published ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </div>
                </div>

                <Field label="Event name">
                  <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start date">
                    <Input type="date" value={form.date ?? ""} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
                  </Field>
                  <Field label="Start time">
                    <Input value={form.time ?? ""} onChange={e => setForm((f: any) => ({ ...f, time: e.target.value }))} placeholder="7:00 PM" />
                  </Field>
                  <Field label="End date">
                    <Input type="date" value={form.endDate ?? ""} onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value }))} />
                  </Field>
                  <Field label="End time">
                    <Input value={form.endTime ?? ""} onChange={e => setForm((f: any) => ({ ...f, endTime: e.target.value }))} placeholder="10:00 PM" />
                  </Field>
                </div>

                <Field label="Venue">
                  <Input value={form.venue ?? ""} onChange={e => setForm((f: any) => ({ ...f, venue: e.target.value }))} />
                </Field>

                <Field label="Category">
                  <Select
                    value={form.category ?? CATEGORIES[0]}
                    onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>

                <Field label="Organizer name">
                  <Input
                    value={form.organizer ?? ""}
                    onChange={e => setForm((f: any) => ({ ...f, organizer: e.target.value }))}
                    placeholder="Your company or name"
                  />
                </Field>

                <Field label="Description">
                  <Textarea
                    value={form.description ?? ""}
                    onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                    rows={4}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Currency">
                    <Input
                      value={form.currency ?? ""}
                      onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))}
                      placeholder="KES"
                      maxLength={5}
                    />
                  </Field>
                  <Field label="Accent colour">
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.accent ?? "#6C5CE7"}
                        onChange={e => setForm((f: any) => ({ ...f, accent: e.target.value }))}
                        className="w-9 h-9 rounded-lg cursor-pointer border border-white/10 bg-transparent shrink-0"
                      />
                      <Input
                        value={form.accent ?? ""}
                        onChange={e => setForm((f: any) => ({ ...f, accent: e.target.value }))}
                        placeholder="#6C5CE7"
                      />
                    </div>
                  </Field>
                </div>

              </div>
            </Card>

            {/* ③ Background Image / Branding — bottom */}
            <Card>
              <CardHeader><CardTitle>Background image</CardTitle></CardHeader>
              <div className="space-y-3">
                {form.bgImage ? (
                  <div className="relative rounded-xl overflow-hidden h-36 border border-white/[0.08]">
                    <img src={form.bgImage} alt="Event background" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-end p-3 gap-2">
                      <label className="cursor-pointer flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-black/70 text-white hover:bg-black/90 transition-colors">
                        <ImagePlus className="w-3.5 h-3.5" />
                        {bgUploading ? "Uploading…" : "Replace"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={bgUploading} />
                      </label>
                      <button
                        onClick={handleBgRemove}
                        className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-red-500/70 text-white hover:bg-red-500/90 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="relative flex flex-col items-center justify-center h-36 rounded-xl border border-dashed border-white/[0.15] cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-all">
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleBgUpload} disabled={bgUploading} />
                    <ImagePlus className="w-6 h-6 text-white/30 mb-2" />
                    <p className="text-[12px] text-white/40">
                      {bgUploading
                        ? "Uploading…"
                        : <><strong className="text-white/60">Click to upload</strong> · max 2 MB</>}
                    </p>
                  </label>
                )}
                <p className="text-[11px] text-white/25">
                  Shown as the hero on the public event page and marketplace card.
                </p>
              </div>
            </Card>

            {/* ④ Danger zone */}
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.15)" }}
            >
              <div>
                <p className="text-[13px] font-medium text-red-400">Delete event</p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  Permanently removes this event and all its data. Cannot be undone.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>

          </div>

          {/* ── Right column — Attendees ──────────────────────────────────── */}
          <div>
            <Card>
              <CardHeader><CardTitle>Attendees ({event.attendees.length})</CardTitle></CardHeader>
              {event.attendees.length === 0 ? (
                <EmptyState icon={Users} title="No attendees yet" description="Share your event link to start selling" />
              ) : (
                <div className="space-y-0 max-h-[540px] overflow-y-auto">
                  {event.attendees.slice(0, 50).map((a: any) => {
                    const cap       = a.tierCapacity ?? 1;
                    const count     = a.checkInCount ?? 0;
                    const fullyUsed = a.checkedIn;
                    const partial   = count > 0 && !fullyUsed;
                    const isOrg     = userRole === "organiser" || userRole === "super_admin";
                    return (
                      <div key={a.id} className="flex items-center gap-2 py-2.5 border-b border-white/[0.05] last:border-0">
                        <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-[10px] text-brand-400 font-bold shrink-0">
                          {a.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-white truncate">{a.name}</div>
                          <div className="text-[10px] text-white/35 truncate">
                            {a.email || a.phone || "—"}
                            {count > 0 && cap > 1 && (
                              <span className="ml-1.5 text-emerald-400/70">· {count}/{cap} entries</span>
                            )}
                          </div>
                        </div>
                        <Badge variant={fullyUsed ? "green" : partial ? "purple" : a.payStatus === "paid" ? "purple" : "gray"}>
                          {fullyUsed ? "In" : partial ? `${count}/${cap}` : a.payStatus}
                        </Badge>
                        {isOrg && count > 0 && (
                          <button
                            onClick={() => handleUndoCheckIn(a.id, a.name)}
                            className="text-[10px] px-2 py-1 rounded-md text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Undo last check-in"
                          >
                            ↩
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
