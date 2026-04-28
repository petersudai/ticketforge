/**
 * lib/api-auth.ts — Server-side authentication and RBAC guard
 *
 * Every API route that mutates or reads private data must start with one of:
 *   const guard = await requireOrganiser(req);
 *   if (guard.error) return guard.error;
 *
 * Structured logging is included on every check so ownership failures are
 * visible in server logs with full context: userId, role, path, reason.
 *
 * No dev-mode passthrough. Auth is enforced in all environments.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Role } from "@/lib/roles";
import { prisma } from "@/lib/db";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── Logging helper ────────────────────────────────────────────────────

function logAuth(
  level: "info" | "warn" | "error",
  event: string,
  ctx: Record<string, unknown>
) {
  const ts  = new Date().toISOString();
  const msg = JSON.stringify({ ts, event, ...ctx });
  if (level === "error") console.error("[api-auth]", msg);
  else if (level === "warn")  console.warn("[api-auth]", msg);
  else                        console.log("[api-auth]", msg);
}

// ── Guard result types ─────────────────────────────────────────────────

export interface GuardSuccess {
  error: null;
  user:  User;
  role:  Role;
  orgId: string | null;   // null only for super_admin with no org
}

export interface GuardFailure {
  error: NextResponse;
  user:  null;
  role:  null;
  orgId: null;
}

export type GuardResult = GuardSuccess | GuardFailure;

// ── Core auth check ───────────────────────────────────────────────────

export async function requireRole(
  req: NextRequest,
  allowedRoles: Role[] = []
): Promise<GuardResult> {
  const path = req.nextUrl.pathname;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    logAuth("error", "supabase_not_configured", { path });
    return {
      error: NextResponse.json(
        { error: "Server misconfiguration: Supabase not configured" },
        { status: 503 }
      ),
      user: null, role: null, orgId: null,
    };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    logAuth("warn", "auth_error", { path, error: error.message });
    return {
      error: NextResponse.json({ error: "Authentication error" }, { status: 401 }),
      user: null, role: null, orgId: null,
    };
  }

  if (!user) {
    logAuth("warn", "no_session", { path });
    return {
      error: NextResponse.json({ error: "Unauthorized — no valid session" }, { status: 401 }),
      user: null, role: null, orgId: null,
    };
  }

  const role = (
    user.user_metadata?.role ??
    user.app_metadata?.role ??
    "organiser"
  ) as Role;

  logAuth("info", "auth_check", { path, userId: user.id, role, allowedRoles });

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    logAuth("warn", "forbidden", { path, userId: user.id, role, allowedRoles });
    return {
      error: NextResponse.json(
        { error: `Forbidden — requires one of: ${allowedRoles.join(", ")}` },
        { status: 403 }
      ),
      user: null, role: null, orgId: null,
    };
  }

  // Resolve the caller's primary orgId from OrgMember table
  const orgId = await getCallerOrgId(user.id);

  return { error: null, user, role, orgId };
}

// ── Ownership helpers ─────────────────────────────────────────────────

/**
 * Verify the calling user is a member of the org that owns a given event.
 *
 * Accepts a GuardSuccess object (returned by requireRole / requireOrganiser)
 * so callers don't need to destructure userId/role/path separately.
 *
 * Super admin: bypasses ownership check.
 * Staff:       checked against StaffEventAssignment (per-event assignment),
 *              NOT OrgMember (org-wide) — enforces event-level isolation.
 * Organiser:   checked against OrgMember for the event's org.
 */
export async function assertEventOwnership(
  eventId: string,
  guard:   GuardSuccess
): Promise<{ ok: true; orgId: string } | { ok: false; response: NextResponse }> {
  const { user, role } = guard;
  const path = `[assertEventOwnership eventId=${eventId}]`;

  if (role === "super_admin") {
    logAuth("info", "ownership_bypassed_super_admin", { path, eventId, userId: user.id });
    return { ok: true, orgId: "*" };
  }

  const event = await (prisma as any).event.findUnique({
    where:  { id: eventId },
    select: { orgId: true },
  }).catch((err: any) => {
    logAuth("error", "ownership_db_error", { path, eventId, userId: user.id, err: err.message });
    return null;
  });

  if (!event) {
    logAuth("warn", "ownership_event_not_found", { path, eventId, userId: user.id });
    return {
      ok: false,
      response: NextResponse.json({ error: "Event not found" }, { status: 404 }),
    };
  }

  if (role === "staff") {
    // Staff are scoped per-event via StaffEventAssignment, NOT org-wide.
    const assignment = await (prisma as any).staffEventAssignment.findUnique({
      where: { supabaseUserId_eventId: { supabaseUserId: user.id, eventId } },
    }).catch(() => null);

    if (!assignment) {
      logAuth("warn", "ownership_staff_not_assigned", {
        path, eventId, userId: user.id, eventOrgId: event.orgId,
      });
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden — you are not assigned to this event" }, { status: 403 }),
      };
    }

    logAuth("info", "ownership_granted_staff", { path, eventId, userId: user.id, orgId: event.orgId });
    return { ok: true, orgId: event.orgId };
  }

  // Organiser: must be an OrgMember of the event's org
  const member = await (prisma as any).orgMember.findFirst({
    where: { supabaseUserId: user.id, orgId: event.orgId },
  }).catch(() => null);

  if (!member) {
    logAuth("warn", "ownership_denied", {
      path, eventId, userId: user.id, eventOrgId: event.orgId,
    });
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — you do not own this event" }, { status: 403 }),
    };
  }

  logAuth("info", "ownership_granted", { path, eventId, userId: user.id, orgId: event.orgId });
  return { ok: true, orgId: event.orgId };
}

/**
 * Resolve the calling user's primary orgId from OrgMember.
 * Used to scope list queries (GET /api/events returns only this org's events).
 */
export async function getCallerOrgId(userId: string): Promise<string | null> {
  const member = await (prisma as any).orgMember.findFirst({
    where:   { supabaseUserId: userId },
    select:  { orgId: true },
    orderBy: { org: { createdAt: "asc" } },
  }).catch(() => null);

  const orgId = member?.orgId ?? null;
  logAuth("info", "resolved_org", { userId, orgId });
  return orgId;
}

// ── Convenience exports ───────────────────────────────────────────────

export const requireSuperAdmin = (req: NextRequest) =>
  requireRole(req, ["super_admin"]);

export const requireOrganiser = (req: NextRequest) =>
  requireRole(req, ["super_admin", "organiser"]);

export const requireScanner = (req: NextRequest) =>
  requireRole(req, ["super_admin", "organiser", "staff"]);

export const requireSession = (req: NextRequest) =>
  requireRole(req, []);
