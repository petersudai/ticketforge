/**
 * lib/supabase-server.ts — Supabase server client
 *
 * Used in Server Components and Route Handlers.
 * Uses the same cookie pattern as middleware so sessions are consistent.
 *
 * For Client Components: use lib/supabase.ts (createBrowserClient) instead.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Role } from "@/lib/roles";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function createSupabaseServerClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll()  { return cookieStore.getAll(); },
      setAll(cs) {
        try {
          cs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Route Handler context — cookies are read-only after headers sent.
          // Middleware handles the actual cookie refresh.
        }
      },
    },
  });
}

export async function getServerUser() {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  // Always use getUser() not getSession() — validates token server-side
  const { data: { user } } = await sb.auth.getUser();
  return user ?? null;
}

export async function getServerSession() {
  const sb = await createSupabaseServerClient();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session ?? null;
}

export async function getServerUserWithRole() {
  const user = await getServerUser();
  if (!user) return null;
  const role = (
    user.user_metadata?.role ??
    user.app_metadata?.role ??
    "organiser"
  ) as Role;
  return { user, role };
}
