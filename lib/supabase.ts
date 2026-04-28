/**
 * lib/supabase.ts — Supabase browser client
 *
 * Uses createBrowserClient from @supabase/ssr.
 * Sessions AND PKCE code verifier stored in cookies (not localStorage),
 * so the server-side callback route can read the verifier.
 *
 * All new signups are organiser role by default.
 * Attendees have no account — they exist only as Attendee DB rows.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";
import type { Role } from "@/lib/roles";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

export function getSupabaseClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}

// ── Sign up (organiser only) ──────────────────────────────────────────
// All self-signup creates an organiser account.
// Staff accounts are created via the invite flow (no self-signup).
// Super Admin is set manually via SQL.

export async function signUpWithEmail(
  email: string,
  password: string,
  orgName: string     // Organizer/Brand Name — stored as full_name in metadata
) {
  const sb = getSupabaseClient();
  if (!sb) return { data: null, error: new Error("Supabase not configured") };
  return sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: orgName,
        name: orgName,
        org_name: orgName,
        role: "organiser",
      },
      // On email confirmation, land on dashboard (not onboarding)
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    },
  });
}

// ── Sign in ───────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabaseClient();
  if (!sb) return { data: null, error: new Error("Supabase not configured") };
  return sb.auth.signInWithPassword({ email, password });
}

// ── Google OAuth (organiser signup/login) ─────────────────────────────

export async function signInWithGoogle() {
  const sb = getSupabaseClient();
  if (!sb) return { data: null, error: new Error("Supabase not configured") };
  return sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

// ── Sign out ──────────────────────────────────────────────────────────

export async function signOut() {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.auth.signOut();
}

// ── Session helpers ───────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

export async function getUser(): Promise<User | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export function getUserRole(user: User | null): Role | null {
  if (!user) return null;
  const role = user.user_metadata?.role ?? user.app_metadata?.role;
  return (role as Role) ?? "organiser";
}

export function onAuthStateChange(
  callback: (user: User | null, session: Session | null) => void
) {
  const sb = getSupabaseClient();
  if (!sb) return { data: { subscription: { unsubscribe: () => {} } } };
  return sb.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null, session);
  });
}

export const supabaseSignInWithGoogle = signInWithGoogle;
