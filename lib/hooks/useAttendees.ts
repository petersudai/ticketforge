"use client";
/**
 * lib/hooks/useAttendees.ts — fetch attendees for a specific event
 *
 * Replaces useStore().events[x].attendees in dashboard pages.
 * Data source: GET /api/attendees?eventId=xxx (ownership enforced).
 *
 * Usage:
 *   const { attendees, loading, error, refetch } = useAttendees(eventId);
 */

import { useState, useEffect, useCallback } from "react";
import type { Attendee } from "@/store/useStore";

export interface UseAttendeesResult {
  attendees: Attendee[];
  loading:   boolean;
  error:     string | null;
  refetch:   () => Promise<void>;
}

export function useAttendees(eventId: string | null): UseAttendeesResult {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) { setAttendees([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendees?eventId=${eventId}`, { credentials: "include" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error ${res.status}`);
        setAttendees([]);
        return;
      }

      const data = await res.json();
      setAttendees(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message ?? "Network error");
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  return { attendees, loading, error, refetch: load };
}
