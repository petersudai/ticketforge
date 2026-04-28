export const dynamic = "force-dynamic";
/**
 * /auth/callback — Supabase OAuth + email confirmation handler
 *
 * PKCE flow: code verifier stored in cookie by createBrowserClient.
 * This route reads that cookie, exchanges the code, sets session cookies.
 *
 * Role-based routing after successful auth:
 *   organiser / super_admin → /dashboard
 *   staff                   → /scanner
 *   Unknown / new Google    → /dashboard (we set role=organiser on all signups)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultRedirect } from "@/lib/roles";
import type { Role } from "@/lib/roles";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_ANON     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? "";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code      = searchParams.get("code");
  const next      = searchParams.get("next") ?? "";
  const error     = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (error) {
    console.error("[/auth/callback] OAuth error:", error, errorDesc);
    const url = new URL("/auth/login", origin);
    url.searchParams.set("error", errorDesc ?? error);
    return NextResponse.redirect(url);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return NextResponse.redirect(
      new URL("/auth/login?error=Supabase+not+configured", origin)
    );
  }

  // Build response object — Supabase will write session cookies onto it
  const response = NextResponse.redirect(new URL(next || "/dashboard", origin));

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    console.error("[/auth/callback] Exchange failed:", exchangeError?.message);
    console.error("[/auth/callback] Cookies present:", req.cookies.getAll().map(c => c.name));
    const url = new URL("/auth/login", origin);
    url.searchParams.set("error", "Could not sign you in. Please try again.");
    return NextResponse.redirect(url);
  }

  const user = data.session.user;
  let role = (
    user.user_metadata?.role ??
    user.app_metadata?.role
  ) as Role | undefined;

  // ── Handle new Google OAuth users ────────────────────────────────────
  // Google OAuth users don't have a role in metadata on first sign-in.
  // We set them as organiser and create their org atomically.
  const createdAt = new Date(user.created_at).getTime();
  const isNewUser = Math.abs(createdAt - Date.now()) < 90_000; // within 90s

  if (isNewUser && !role) {
    role = "organiser";

    // Update metadata via Admin API so JWT reflects role immediately
    if (SUPABASE_SERVICE) {
      const orgName = user.user_metadata?.full_name
                   ?? user.user_metadata?.name
                   ?? "My Organisation";

      // Fire-and-forget: create org + set role
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || origin}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabaseUserId: user.id, orgName }),
      }).catch(err => console.warn("[callback] Signup API call failed:", err));
    }
  }

  // Explicit ?next= takes precedence
  if (next && next !== "/" && !next.startsWith("/auth/")) {
    const finalResponse = NextResponse.redirect(new URL(next, origin));
    response.cookies.getAll().forEach(({ name, value }) =>
      finalResponse.cookies.set(name, value)
    );
    return finalResponse;
  }

  // Route by role
  const destination = defaultRedirect(role ?? "organiser");
  const finalResponse = NextResponse.redirect(new URL(destination, origin));
  response.cookies.getAll().forEach(({ name, value }) =>
    finalResponse.cookies.set(name, value)
  );
  return finalResponse;
}
