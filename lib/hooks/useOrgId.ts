"use client";
/**
 * lib/hooks/useOrgId.ts
 *
 * Resolves the current organiser's primary orgId from the auth context.
 * Returns the orgId from user_metadata if available, otherwise fetches
 * from /api/auth/me once and caches it for the session.
 *
 * Used by dashboard pages that need to scope API calls to the current org.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function useOrgId(): { orgId: string | null; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [orgId,   setOrgId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setOrgId(null);
      setLoading(false);
      return;
    }

    // First try user_metadata — fastest path
    const metaOrgId = user.user_metadata?.org_id as string | undefined;
    if (metaOrgId) {
      setOrgId(metaOrgId);
      setLoading(false);
      return;
    }

    // Fallback: /api/auth/me — DB lookup
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.orgId) setOrgId(data.orgId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  return { orgId, loading };
}
