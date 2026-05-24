"use client";

/**
 * app/(dashboard)/team/page.tsx
 *
 * Team management page. Visible at /team for organisers and super_admin.
 *
 * Three sections:
 *   1. Team members  — accepted members (owner / admin / staff)
 *   2. Pending invites — sent invitations awaiting acceptance
 *   3. Invite form    — collapsible. Sends a staff invite via existing API.
 *
 * Out of scope for this iteration (will follow if real usage demands them):
 *   • Revoking pending invites
 *   • Resending invite emails
 *   • Removing team members
 *   • Role changes
 *   • Inviting non-staff roles (co-organisers, admins)
 *
 * Data sources:
 *   GET /api/team               → members list (org-scoped, server-enforced)
 *   GET /api/staff/invite/list  → pending invites (org-scoped, server-enforced)
 *   POST /api/staff/invite      → send a new invite (existing route)
 *   GET /api/events             → for the event multi-select (org-scoped)
 *
 * All scoping happens server-side. The client never specifies orgId.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { useAuth } from "@/lib/auth-context";
import {
  Card, CardHeader, CardTitle, Button, Input, Field, EmptyState,
} from "@/components/ui";
import { TipBubble } from "@/components/ui/TipBubble";
import { formatDate } from "@/lib/utils";
import {
  UserPlus, Mail, Crown, Shield, User as UserIcon, Clock,
  Send, X, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface TeamMember {
  id:             string;
  supabaseUserId: string;
  role:           "owner" | "admin" | "staff" | string;
  fullName:       string | null;
  joinedAt:       string | null;
  isYou:          boolean;
}

interface PendingInvite {
  id:         string;
  name:       string;
  email:      string;
  expiresAt:  string;
  createdAt:  string;
  eventCount: number;
  events:     { id: string; name: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────

function relativeExpiry(iso: string): string {
  const expiry = new Date(iso).getTime();
  const now    = Date.now();
  const diffMs = expiry - now;
  if (diffMs <= 0) return "expired";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1)  return "expires in <1h";
  if (hours < 24) return `expires in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `expires in ${days}d`;
}

const ROLE_BADGE: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  owner: { label: "Owner", bg: "rgba(225,112,85,0.15)", color: "#e17055", icon: Crown },
  admin: { label: "Admin", bg: "rgba(108,92,231,0.15)", color: "#a29cf4", icon: Shield },
  staff: { label: "Staff", bg: "rgba(9,132,227,0.15)",  color: "#74b9ff", icon: UserIcon },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_BADGE[role] ?? ROLE_BADGE.staff;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ── Invite form (collapsible) ─────────────────────────────────────────

interface InviteFormProps {
  events:   { id: string; name: string }[];
  onSent:   () => void; // called after a successful send so the lists refetch
  onCancel: () => void;
}

function InviteForm({ events, onSent, onCancel }: InviteFormProps) {
  const [name,           setName]           = useState("");
  const [email,          setEmail]          = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");

  const toggleEvent = (eventId: string) =>
    setSelectedEvents(prev => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation. The API re-validates server-side too.
    if (!name.trim())  return setError("Please enter a name.");
    if (!email.trim()) return setError("Please enter an email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("That doesn't look like a valid email address.");
    }
    if (selectedEvents.size === 0) {
      return setError("Pick at least one event this person can scan.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/staff/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name:     name.trim(),
          email:    email.trim(),
          eventIds: Array.from(selectedEvents),
          // orgId intentionally omitted — the server derives it from the
          // caller's session. Sending it from the client would be theatre
          // (the server validates membership anyway). See API for details.
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? `Failed to send invite (${res.status}).`);
        setSubmitting(false);
        return;
      }

      setSuccess(`Invite sent to ${email.trim()}.`);
      setName("");
      setEmail("");
      setSelectedEvents(new Set());
      onSent();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a team member</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">
          <X className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>

      <form onSubmit={handleSend} className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-[12px] text-red-300">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-[12px] text-emerald-300">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name *">
            <Input
              type="text" autoComplete="off" required
              placeholder="e.g. Wanjiru Kamau"
              value={name} onChange={e => setName(e.target.value)}
            />
          </Field>
          <Field label="Email address *">
            <Input
              type="email" autoComplete="off" required
              placeholder="staff@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <label className="block text-[11px] text-white/45 mb-1.5">
            Events this person can scan *{" "}
            <span className="text-white/25 font-normal">
              ({selectedEvents.size} selected)
            </span>
          </label>

          {events.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] px-3 py-3 text-[12px] text-white/45">
              You don't have any events yet. Create one first, then come back to invite staff.
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] max-h-[180px] overflow-y-auto scrollbar-thin">
              {events.map(ev => {
                const checked = selectedEvents.has(ev.id);
                return (
                  <label
                    key={ev.id}
                    className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.04] last:border-b-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEvent(ev.id)}
                      className="w-3.5 h-3.5 accent-brand-500"
                    />
                    <span className="text-[12px] text-white/80 flex-1 truncate">{ev.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || events.length === 0}
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
              : <><Send className="w-3.5 h-3.5" /> Send invite</>}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <p className="ml-auto text-[10px] text-white/30">
            An email with a 48-hour accept link is sent immediately.
          </p>
        </div>
      </form>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function TeamPage() {
  // We deliberately don't gate the page on auth — the dashboard layout +
  // proxy.ts middleware already enforce that. If somehow an unauthed user
  // reaches here, the API calls below will 401 and we show the error state.
  // We DO wait for authLoading to settle before firing fetches so we don't
  // race the cookie refresh on first paint.
  const { loading: authLoading } = useAuth();

  const [members,        setMembers]        = useState<TeamMember[]>([]);
  const [invites,        setInvites]        = useState<PendingInvite[]>([]);
  const [callerOrgId,    setCallerOrgId]    = useState<string | null>(null);
  const [loadingData,    setLoadingData]    = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { events, loading: eventsLoading } = useEvents();

  // Active events that are ELIGIBLE as invite targets:
  //   • Published (drafts don't make sense to assign staff to)
  //   • Not in the past (no point sending staff to a past event)
  //   • In the caller's own org (super_admin sees all events platform-wide via
  //     /api/events, but the invite must be scoped to ONE org — their own)
  const inviteableEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (events ?? [])
      .filter((e: any) => {
        if (!e.published) return false;
        // Org scoping: only events whose org matches the caller's own org.
        // For organisers this is a no-op (every event they see is theirs).
        // For super_admin this prevents inviting staff to other orgs' events
        // — staff invites are inherently single-org.
        if (callerOrgId && e.org?.id && e.org.id !== callerOrgId) return false;
        const parts = (e.date as string).split("-");
        const day = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return day >= today;
      })
      .map((e: any) => ({ id: e.id, name: e.name }));
  }, [events, callerOrgId]);

  // ── Fetch members + invites + caller's orgId (parallel) ────────────
  const refetchAll = useCallback(async () => {
    setError(null);
    setLoadingData(true);
    try {
      const [memRes, invRes, meRes] = await Promise.all([
        fetch("/api/team",               { credentials: "include" }),
        fetch("/api/staff/invite/list",  { credentials: "include" }),
        fetch("/api/auth/me",            { credentials: "include" }),
      ]);

      if (!memRes.ok) {
        const d = await memRes.json().catch(() => ({}));
        throw new Error(d.error ?? `Failed to load team (${memRes.status})`);
      }
      if (!invRes.ok) {
        const d = await invRes.json().catch(() => ({}));
        throw new Error(d.error ?? `Failed to load invites (${invRes.status})`);
      }
      // /api/auth/me is best-effort — used only to scope event filter for
      // super admins. If it fails, organisers still get correct results
      // (they see only their org's events anyway), and super admin sees
      // all events as a fallback (slightly leakier but not insecure —
      // the server still enforces org scoping on invite creation).
      const [memData, invData] = await Promise.all([memRes.json(), invRes.json()]);
      setMembers(Array.isArray(memData) ? memData : []);
      setInvites(Array.isArray(invData) ? invData : []);

      if (meRes.ok) {
        const meData = await meRes.json().catch(() => ({}));
        setCallerOrgId(meData?.orgId ?? null);
      }
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    // Wait until auth has resolved before fetching. If user is null after
    // auth resolves, the API will 401 and the error state handles it.
    if (authLoading) return;
    refetchAll();
  }, [authLoading, refetchAll]);

  // ── Render ──────────────────────────────────────────────────────────

  const loading = authLoading || loadingData || eventsLoading;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">
      <TipBubble
        id="team-page-welcome"
        title="Manage your team"
        body="Invite gate staff to scan tickets at specific events. They get a 48-hour email link to set up their account. Once they accept, they appear in your team members list below."
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Team</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">
            {loading
              ? "Loading…"
              : `${members.length} member${members.length !== 1 ? "s" : ""}`}
            {!loading && invites.length > 0 && (
              <> · <span className="text-amber-400">{invites.length} pending</span></>
            )}
          </p>
        </div>
        {!showInviteForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowInviteForm(true)}
            disabled={loading}
          >
            <UserPlus className="w-3.5 h-3.5" /> Invite team member
          </Button>
        )}
      </div>

      {/* Invite form (collapsible) */}
      {showInviteForm && (
        <InviteForm
          events={inviteableEvents}
          onSent={() => {
            // Refetch invites so the new one appears, but keep the form open
            // so the organiser can send several in a row without re-clicking.
            refetchAll();
          }}
          onCancel={() => setShowInviteForm(false)}
        />
      )}

      {/* Error banner */}
      {error && (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-red-400 mb-1">Couldn't load team data</div>
              <p className="text-[12px] text-white/45">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={refetchAll}>Retry</Button>
          </div>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
        </CardHeader>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-white/[0.04] rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={UserIcon}
            title="No team members yet"
            description="You're the first one here. Invite gate staff to help scan tickets at your events."
          />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{
                    background: "rgba(108,92,231,0.15)",
                    color:      "#a29cf4",
                  }}
                  aria-hidden="true"
                >
                  {(m.fullName ?? "?").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-white truncate">
                      {m.fullName ?? "(no name set)"}
                    </span>
                    {m.isYou && (
                      <span className="text-[10px] text-white/30">(you)</span>
                    )}
                    <RoleBadge role={m.role} />
                  </div>
                  {m.joinedAt && (
                    <div className="text-[11px] text-white/35">
                      Joined {formatDate(m.joinedAt.slice(0, 10))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pending invites */}
      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-white/[0.04] rounded-lg" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No pending invitations"
            description="When you invite someone, they'll appear here until they accept."
          />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(253,203,110,0.12)",
                    color:      "#fdcb6e",
                  }}
                  aria-hidden="true"
                >
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-white truncate">{inv.name}</span>
                    <span className="text-[11px] text-white/40 truncate">{inv.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/35 mt-0.5">
                    <span>
                      {inv.eventCount} event{inv.eventCount !== 1 ? "s" : ""}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {relativeExpiry(inv.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
