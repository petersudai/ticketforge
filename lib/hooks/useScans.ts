"use client";
/**
 * lib/hooks/useScans.ts — fetch scan log for a specific event
 *
 * Replaces useStore().scans in the scanner and analytics pages.
 * Data source: GET /api/scan?eventId=xxx (ownership enforced).
 *
 * Usage:
 *   const { scans, loading, error, refetch } = useScans(eventId);
 */

import { useState, useEffect, useCallback } from "react";
import type { Scan } from "@/store/useStore";

export interface UseScansResult {
  scans:   Scan[];
  loading: boolean;
  error:   string | null;
  refetch: () => Promise<void>;
}

export function useScans(eventId: string | null): UseScansResult {
  const [scans,   setScans]   = useState<Scan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) { setScans([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan?eventId=${eventId}`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error ${res.status}`);
        setScans([]);
        return;
      }
      const data = await res.json();
      setScans(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message ?? "Network error");
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  return { scans, loading, error, refetch: load };
}
