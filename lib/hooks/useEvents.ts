"use client";
/**
 * lib/hooks/useEvents.ts — fetch the authenticated organiser's events from DB
 *
 * Replaces useStore().events in all dashboard pages.
 * Data source: GET /api/events (Postgres, org-scoped, ownership enforced).
 *
 * Usage:
 *   const { events, loading, error, refetch } = useEvents();
 */

import { useState, useEffect, useCallback } from "react";
import type { Event } from "@/store/useStore"; // shape types only

export interface UseEventsResult {
  events:  Event[];
  loading: boolean;
  error:   string | null;
  refetch: () => Promise<void>;
}

export function useEvents(): UseEventsResult {
  const [events,  setEvents]  = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events", { credentials: "include" });

      if (res.status === 401 || res.status === 403) {
        setError("Not authorised. Please sign in.");
        setEvents([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error ${res.status}`);
        setEvents([]);
        return;
      }

      const data = await res.json();
      // Flatten attendee.tier objects into string + tierCapacity so all
      // components can use tier as a plain string (the store type contract).
      const normalized = Array.isArray(data)
        ? data.map((ev: any) => ({
            ...ev,
            attendees: (ev.attendees ?? []).map((a: any) => {
              if (a.tier && typeof a.tier === "object") {
                return { ...a, tier: a.tier.name ?? "", tierCapacity: a.tier.capacity ?? 1 };
              }
              return a;
            }),
          }))
        : [];
      setEvents(normalized);
    } catch (err: any) {
      setError(err.message ?? "Network error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { events, loading, error, refetch: load };
}
