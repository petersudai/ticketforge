"use client";
/**
 * lib/auth-context.tsx — Singleton Supabase auth context
 *
 * Single getUser() call per page load, shared across all components.
 * Fixes Supabase IndexedDB lock contention from multiple concurrent calls.
 *
 * ROLE RESOLUTION (in order):
 *   1. user_metadata.role  (JWT — set by trigger/admin API on signup)
 *   2. app_metadata.role   (set server-side by admin)
 *   3. /api/auth/me        (DB Profile fallback — for users created before trigger)
 *   4. "organiser"         (safe default for authenticated users)
 *
 * This fixes Issue 6 (nav missing) when user_metadata.role is null.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase";
import type { Role } from "@/lib/roles";

interface AuthState {
  user:    User | null;
  role:    Role | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user:    null,
  role:    null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [role,    setRole]    = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const u = await getUser();
      setUser(u);

      if (!u) {
        setRole(null);
        return;
      }

      // ── Role resolution ──────────────────────────────────────────
      const metaRole = u.user_metadata?.role ?? u.app_metadata?.role;

      if (metaRole && ["super_admin", "organiser", "staff"].includes(metaRole)) {
        setRole(metaRole as Role);
        return;
      }

      // Fallback: fetch role from DB Profile via /api/auth/me
      // Handles users created before the trigger set metadata
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const dbRole = data.role;
          if (dbRole && ["super_admin", "organiser", "staff"].includes(dbRole)) {
            setRole(dbRole as Role);
            return;
          }
        }
      } catch {
        // Network error — use safe default
      }

      // Final fallback: authenticated users who got through login are organisers
      setRole("organiser");
    } catch {
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, role, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
