export const dynamic = "force-dynamic";

/**
 * GET /api/team
 *
 * Returns the current team members in the caller's organisation.
 * "Team members" = anyone with an OrgMember row in this org
 *                  (owner, admin, staff who have already accepted their invite).
 *
 * Auth:
 *   • organiser   → sees their own org's members
 *   • super_admin → sees their own org's members (same as organiser)
 *
 *   Per our team-page design decision: super admins see the team of whichever
 *   org they belong to, not platform-wide users. Cross-org user management
 *   belongs in a future /admin/users hub, not here.
 *
 * Response shape (each item):
 *   {
 *     id:             OrgMember.id (string)
 *     supabaseUserId: auth.users.id
 *     role:           "owner" | "admin" | "staff"
 *     fullName:       Profile.fullName (string | null)
 *     joinedAt:       Profile.createdAt (ISO string | null)
 *     isYou:          true when this row is the caller themselves
 *   }
 *
 * We intentionally do NOT include email here. Email lives in Supabase's
 * auth.users table and would require N admin-API calls to fetch. The pending-
 * invites endpoint shows email (which is in our DB), so users can identify
 * pending team members by email. Member emails can be added later if needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  const orgId = guard.orgId;

  // No org yet (signed up but never created an event) → empty team.
  // Don't 500 — this is a valid state for a fresh organiser.
  if (!orgId) {
    return NextResponse.json([]);
  }

  try {
    // 1. All OrgMember rows for this org.
    const members = await (prisma as any).orgMember.findMany({
      where: { orgId },
      select: {
        id:             true,
        role:           true,
        supabaseUserId: true,
      },
    });

    if (members.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Profile rows for the same users, fetched in ONE query.
    //    Some users may not have a Profile (legacy / partial-signup edge cases);
    //    we still return them, just with fullName: null / joinedAt: null.
    const supabaseUserIds = members.map((m: any) => m.supabaseUserId);
    const profiles = await (prisma as any).profile.findMany({
      where:  { supabaseUserId: { in: supabaseUserIds } },
      select: {
        supabaseUserId: true,
        fullName:       true,
        createdAt:      true,
      },
    });

    // Indexed for O(1) join below.
    const profileByUser = new Map<string, { fullName: string | null; createdAt: Date }>();
    for (const p of profiles) {
      profileByUser.set(p.supabaseUserId, {
        fullName:  p.fullName ?? null,
        createdAt: p.createdAt,
      });
    }

    // 3. Merge + sort. Owner first, then admin, then staff. Within a role,
    //    older members first (joinedAt ascending).
    const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, staff: 2 };

    const enriched = members.map((m: any) => {
      const p = profileByUser.get(m.supabaseUserId);
      return {
        id:             m.id,
        supabaseUserId: m.supabaseUserId,
        role:           m.role,
        fullName:       p?.fullName ?? null,
        joinedAt:       p?.createdAt ? p.createdAt.toISOString() : null,
        isYou:          m.supabaseUserId === guard.user.id,
      };
    }).sort((a: any, b: any) => {
      const rA = ROLE_RANK[a.role] ?? 99;
      const rB = ROLE_RANK[b.role] ?? 99;
      if (rA !== rB) return rA - rB;
      // Older joiners first within a role
      if (!a.joinedAt) return  1;
      if (!b.joinedAt) return -1;
      return a.joinedAt.localeCompare(b.joinedAt);
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[GET /api/team]", err);
    return NextResponse.json(
      { error: "Failed to load team members" },
      { status: 500 }
    );
  }
}
