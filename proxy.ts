/**
 * proxy.ts — Supabase Auth + RBAC route protection
 *
 * In Next.js 16, `middleware.ts` was renamed to `proxy.ts` and the exported
 * function changed from `middleware` to `proxy`. This file replaces the old
 * middleware.ts. See: node_modules/next/dist/docs/01-app/03-api-reference/
 *                      03-file-conventions/proxy.md
 *
 * Routing rules:
 *   Public routes          → always pass through, no auth check
 *   /auth/invite/*         → session-only (staff accept flow)
 *   Dashboard routes       → need valid session + correct role
 *   No session on protected route → redirect to /auth/login?next=...
 *   Wrong role             → redirect to defaultRedirect(role)
 *
 * Cookie refresh: Supabase access tokens expire every hour.
 * Proxy MUST write refreshed cookies back onto the response.
 *
 * getUser() vs getSession():
 *   Always use getUser() — it validates the JWT with Supabase every time.
 *   getSession() reads from cookie and can return expired/stale tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccess, defaultRedirect } from "@/lib/roles";
import type { Role } from "@/lib/roles";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Routes that need a session + role check
const PROTECTED = [
  "/dashboard", "/attendees", "/tickets", "/email",
  "/revenue", "/analytics", "/settings",
  "/events/new", "/events/edit", "/public-page",
  "/admin", "/team", "/debug",
];

// Routes that need only a valid session (no role check)
const SESSION_ONLY = ["/auth/invite"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected   = PROTECTED.some(p => pathname.startsWith(p));
  const isSessionOnly = SESSION_ONLY.some(p => pathname.startsWith(p));

  if (!isProtected && !isSessionOnly) return NextResponse.next();

  // Supabase not configured — block hard in production, warn in dev
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed: never expose protected routes when auth is misconfigured
      return NextResponse.json(
        { error: "Service unavailable — auth not configured" },
        { status: 503 }
      );
    }
    console.warn("[proxy] Supabase not configured — skipping auth check (dev only)");
    return NextResponse.next();
  }

  // Build a mutable response that Supabase can write refreshed cookies onto
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Step 1 — update request cookies for this execution
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        // Step 2 — rebuild response so browser gets refreshed cookies
        res = NextResponse.next({ request: { headers: req.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() validates the JWT with Supabase — never returns stale sessions
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.warn("[proxy] Auth error:", error.message);
  }

  // No valid session → login
  if (!user) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session-only routes (e.g. staff invite accept): any authenticated user passes
  if (isSessionOnly) {
    return res;
  }

  // Read role from JWT metadata (fastest path — no DB call needed)
  const role = (
    user.user_metadata?.role ??
    user.app_metadata?.role ??
    "organiser"
  ) as Role;

  // RBAC check
  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(new URL(defaultRedirect(role), req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendees/:path*",
    "/tickets/:path*",
    "/email/:path*",
    "/revenue/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/events/new/:path*",
    "/events/edit/:path*",
    "/public-page/:path*",
    "/admin/:path*",
    "/team/:path*",
    "/auth/invite/:path*",
    "/debug/:path*",
    "/debug",
  ],
};
