/**
 * lib/roles.ts — Role-Based Access Control (RBAC)
 *
 * Role hierarchy (highest → lowest):
 *   super_admin → platform owner(s), manual assignment only
 *   organiser   → event creator, full dashboard for their org
 *   staff       → gate worker, scanner + assigned events only
 *
 * NOTE: "attendee" is NOT a role. Ticket buyers have no account.
 * They exist only as Attendee rows in the DB, accessed via ticket URL.
 */

export type Role = "super_admin" | "organiser" | "staff";

// ── Route access map ──────────────────────────────────────────────────

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard":   ["super_admin", "organiser"],
  "/events":      ["super_admin", "organiser"],
  "/events/new":  ["super_admin", "organiser"],
  "/events/edit": ["super_admin", "organiser"],
  "/attendees":   ["super_admin", "organiser", "staff"],
  "/tickets":     ["super_admin", "organiser"],
  "/email":       ["super_admin", "organiser"],
  "/revenue":     ["super_admin", "organiser"],
  "/analytics":   ["super_admin", "organiser", "staff"],
  "/public-page": ["super_admin", "organiser"],
  "/settings":    ["super_admin", "organiser"],
  "/scanner":     ["super_admin", "organiser", "staff"],
  "/admin":       ["super_admin"],
  "/debug":       ["super_admin"],
  "/team":        ["super_admin", "organiser"],
};

/** Routes that only need a valid session — no role check */
export const SESSION_ONLY_ROUTES = ["/auth/invite"];

/** Public routes — no auth required */
export const PUBLIC_ROUTES = [
  "/",
  "/marketplace",
  "/demo",
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/scanner",      // Gate scanner is public, PIN-protected at the app level
  "/events",       // Public event pages /events/[slug]
  "/ticket",       // Public ticket download /ticket/[id]
  "/resend-ticket",
];

// ── Permission helpers ────────────────────────────────────────────────

export function canAccess(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;

  const match = Object.entries(ROUTE_ACCESS)
    .filter(([route]) => pathname.startsWith(route))
    .sort((a, b) => b[0].length - a[0].length)[0];

  if (!match) return false;
  return match[1].includes(role);
}

export function isSuperAdmin(role: Role | null): boolean {
  return role === "super_admin";
}

export function isOrganiser(role: Role | null): boolean {
  return role === "super_admin" || role === "organiser";
}

export function isStaff(role: Role | null): boolean {
  return role === "staff";
}

export function canManageEvents(role: Role | null): boolean {
  return role === "super_admin" || role === "organiser";
}

export function canScan(role: Role | null): boolean {
  return role === "super_admin" || role === "organiser" || role === "staff";
}

export function canViewRevenue(role: Role | null): boolean {
  return role === "super_admin" || role === "organiser";
}

// ── Display helpers ───────────────────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  organiser:   "Event Organiser",
  staff:       "Gate Staff",
};

export const ROLE_COLORS: Record<Role, string> = {
  super_admin: "#e17055",
  organiser:   "#6C5CE7",
  staff:       "#0984e3",
};

// ── Post-login redirect ───────────────────────────────────────────────

export function defaultRedirect(role: Role | null): string {
  switch (role) {
    case "super_admin": return "/dashboard";
    case "organiser":   return "/dashboard";
    case "staff":       return "/scanner";
    default:            return "/auth/login";
  }
}
