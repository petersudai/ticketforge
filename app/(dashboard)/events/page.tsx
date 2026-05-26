"use client";

/**
 * app/(dashboard)/events/page.tsx
 *
 * The Events listing page. Shown to anyone who clicks "Events" in the
 * dashboard sidebar.
 *
 * Two layouts, role-aware:
 *   • organiser   → flat list of their org's events
 *   • super_admin → events grouped by Organisation, each group collapsible
 *                   with summary stats (event count, tickets sold, revenue)
 *
 * Data source:
 *   useEvents() → GET /api/events, which is already org-scoped on the server.
 *   The route returns every event for super_admin; for organisers it's their
 *   org only. We do NOT re-filter by role on the client — the server is the
 *   source of truth. The role here only changes UI shape.
 *
 * Why this page exists:
 *   It used to be a 5-line redirect("/") stub, which made clicking "Events"
 *   in the sidebar bounce the user to the landing page. This is the proper
 *   implementation.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useEvents } from "@/lib/hooks/useEvents";
import { useAuth } from "@/lib/auth-context";
import { isSuperAdmin } from "@/lib/roles";
import { Card, Button, Input, EmptyState } from "@/components/ui";
import { TipBubble } from "@/components/ui/TipBubble";
import { formatDate } from "@/lib/utils";
import {
  Plus, Search, CalendarDays, Building2, ChevronDown, ChevronRight,
  ArrowRight, X, AlertCircle,
} from "lucide-react";

// ── Status helpers ────────────────────────────────────────────────────

type EventStatus = "Active" | "Past" | "Draft";

function statusOf(event: any): EventStatus {
  if (!event.published) return "Draft";
  // Date is YYYY-MM-DD; build a local Date so timezone never trips us up.
  const parts    = (event.date as string).split("-");
  const eventDay = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDay < today ? "Past" : "Active";
}

const STATUS_STYLE: Record<EventStatus, React.CSSProperties> = {
  Active: { background: "rgba(85,239,196,0.12)",  color: "#55efc4",            border: "1px solid rgba(85,239,196,0.22)" },
  Past:   { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" },
  Draft:  { background: "rgba(253,203,110,0.10)", color: "#fdcb6e",            border: "1px solid rgba(253,203,110,0.22)" },
};

// Status filter options. "All" plus the three real statuses.
const STATUS_FILTERS: ("All" | EventStatus)[] = ["All", "Active", "Draft", "Past"];

// ── Aggregation helpers ───────────────────────────────────────────────
//
// We only count "primary" attendees (slotIndex === 0) so tickets that admit
// multiple people (Group of 5, VIP Table) are not double-counted. This
// matches the convention used in app/dashboard/page.tsx.
function primaryAttendees(att: any[]): any[] {
  return att.filter(a => (a.slotIndex ?? 0) === 0);
}

function ticketsSold(event: any): number {
  return primaryAttendees(event.attendees ?? []).length;
}

function revenueOf(event: any): number {
  return primaryAttendees(event.attendees ?? [])
    .filter(a => a.payStatus === "paid")
    .reduce((s: number, a: any) => s + a.pricePaid * ((a as any).tierCapacity ?? 1), 0);
}

// ── Single event row ─────────────────────────────────────────────────

function EventRow({ event }: { event: any }) {
  const sold    = ticketsSold(event);
  const revenue = revenueOf(event);
  const status  = statusOf(event);

  return (
    <Link
      href={`/events/edit/${event.id}`}
      className="group block px-4 py-3 rounded-xl hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Accent dot for visual scanning */}
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: event.accent ?? "#6C5CE7" }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-white text-[13px] truncate">{event.name}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={STATUS_STYLE[status]}
            >
              {status}
            </span>
          </div>
          <div className="text-[11px] text-white/35 truncate">
            {formatDate(event.date)}{event.venue ? ` · ${event.venue}` : ""}
          </div>
        </div>

        {/* Sold / revenue — hidden on very narrow screens to keep the row scannable */}
        <div className="hidden sm:flex items-center gap-5 shrink-0">
          <div className="text-right">
            <div className="text-[11px] font-medium text-white/70 tabular-nums">{sold}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">tickets</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium text-emerald-400 tabular-nums">
              KES {Math.round(revenue).toLocaleString()}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">revenue</div>
          </div>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// ── Super-admin org group ─────────────────────────────────────────────

function OrgGroup({
  orgName, events, collapsed, onToggle,
}: {
  orgName:   string;
  events:    any[];
  collapsed: boolean;
  onToggle:  () => void;
}) {
  const totalTickets = events.reduce((s, e) => s + ticketsSold(e), 0);
  const totalRevenue = events.reduce((s, e) => s + revenueOf(e), 0);

  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
        aria-expanded={!collapsed}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(108,92,231,0.15)", color: "#a29cf4" }}>
          <Building2 className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[14px] text-white truncate">{orgName}</div>
          <div className="text-[11px] text-white/40 mt-0.5">
            {events.length} event{events.length !== 1 ? "s" : ""}
            {" · "}
            {totalTickets} ticket{totalTickets !== 1 ? "s" : ""} sold
            {" · "}
            <span className="text-emerald-400">KES {Math.round(totalRevenue).toLocaleString()}</span> revenue
          </div>
        </div>

        {collapsed
          ? <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
          : <ChevronDown  className="w-4 h-4 text-white/30 shrink-0" />}
      </button>

      {!collapsed && (
        <div className="border-t border-white/[0.06] p-1.5 space-y-0.5">
          {events.map(e => <EventRow key={e.id} event={e} />)}
        </div>
      )}
    </Card>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 animate-pulse">
      <div className="h-10 bg-white/[0.04] rounded-xl w-1/3" />
      <div className="h-12 bg-white/[0.04] rounded-xl" />
      <div className="h-32 bg-white/[0.04] rounded-xl" />
      <div className="h-32 bg-white/[0.04] rounded-xl" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export default function EventsPage() {
  const { events, loading, error } = useEvents();
  const { role }                   = useAuth();
  const superAdmin                 = isSuperAdmin(role);

  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<"All" | EventStatus>("All");
  // Collapsed org IDs. Empty by default → all groups open on first render.
  const [collapsed,     setCollapsed]     = useState<Set<string>>(new Set());

  // ── Filter (search + status) ───────────────────────────────────────
  // Memoised so we don't recompute on every keystroke unrelated to filters.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(e => {
      if (statusFilter !== "All" && statusOf(e) !== statusFilter) return false;
      if (!q) return true;
      return (
        e.name?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q) ||
        e.organizer?.toLowerCase().includes(q) ||
        (e as any).org?.name?.toLowerCase().includes(q)
      );
    });
  }, [events, search, statusFilter]);

  // ── Group by org (super_admin only) ────────────────────────────────
  const grouped = useMemo(() => {
    if (!superAdmin) return null;
    const map = new Map<string, { id: string; name: string; events: any[] }>();
    for (const e of filtered) {
      const org = (e as any).org;
      const key = org?.id ?? "unassigned";
      const existing = map.get(key);
      if (existing) {
        existing.events.push(e);
      } else {
        map.set(key, {
          id:     key,
          name:   org?.name ?? "Unassigned",
          events: [e],
        });
      }
    }
    // Sort groups alphabetically by org name, but pin "Unassigned" last.
    return Array.from(map.values()).sort((a, b) => {
      if (a.id === "unassigned") return  1;
      if (b.id === "unassigned") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, superAdmin]);

  const toggleOrg = (orgId: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(orgId) ? next.delete(orgId) : next.add(orgId);
      return next;
    });

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[13px] font-medium text-red-400 mb-1">Couldn't load events</div>
              <p className="text-[12px] text-white/45">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const hasFilters    = search.trim() !== "" || statusFilter !== "All";
  const totalShowing  = filtered.length;
  const totalAll      = events.length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* First-time tip (different copy per role) */}
      <TipBubble
        id={superAdmin ? "events-page-super-welcome" : "events-page-welcome"}
        title={superAdmin ? "All events across the platform" : "Your events"}
        body={
          superAdmin
            ? "You're viewing every event from every organisation on TicketForge. Groups are collapsible. Click an org name to expand or hide its events. Use search to find an event by name, venue, or org."
            : "Every event you've created lives here. Click any event to edit its details, tiers, or settings. Use the search box to find one quickly when you have many."
        }
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-[22px] tracking-tight">Events</h1>
          <p className="text-[12px] text-[#5a5a72] mt-1">
            {totalShowing === totalAll
              ? `${totalAll} event${totalAll !== 1 ? "s" : ""}`
              : `${totalShowing} of ${totalAll} event${totalAll !== 1 ? "s" : ""}`}
            {superAdmin && grouped && ` · ${grouped.length} organisation${grouped.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/events/new">
          <Button variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5" /> New event
          </Button>
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
          <Input
            placeholder={superAdmin
              ? "Search by event, venue, or organisation…"
              : "Search by event name or venue…"}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 shrink-0">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-2 rounded-[10px] text-[11px] font-semibold transition-colors"
              style={{
                background: statusFilter === s ? "rgba(108,92,231,0.18)" : "rgba(255,255,255,0.04)",
                color:      statusFilter === s ? "#a29cf4"               : "rgba(255,255,255,0.5)",
                border:    `1px solid ${statusFilter === s ? "rgba(108,92,231,0.35)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Body — empty / grouped / flat */}
      {filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState
              icon={Search}
              title="No matching events"
              description="Try a different search term or clear your filters."
            />
          ) : (
            <div>
              <EmptyState
                icon={CalendarDays}
                title="No events yet"
                description="Create your first event to start selling tickets."
              />
              <div className="flex justify-center mt-3">
                <Link href="/events/new">
                  <Button variant="primary" size="sm">
                    <Plus className="w-3.5 h-3.5" /> Create event
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      ) : superAdmin && grouped ? (
        <div className="space-y-3">
          {grouped.map(g => (
            <OrgGroup
              key={g.id}
              orgName={g.name}
              events={g.events}
              collapsed={collapsed.has(g.id)}
              onToggle={() => toggleOrg(g.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-1.5 space-y-0.5">
          {filtered.map(e => <EventRow key={e.id} event={e} />)}
        </Card>
      )}
    </div>
  );
}
