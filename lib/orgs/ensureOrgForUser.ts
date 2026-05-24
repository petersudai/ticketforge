/**
 * lib/orgs/ensureOrgForUser.ts
 *
 * Single source of truth for "this Supabase user must have an Organisation
 * and an OrgMember row". Used by every entry point that might be the first
 * place a half-signed-up user lands:
 *
 *   • POST /api/auth/signup  — explicit setup after Supabase signUp()
 *   • GET  /api/auth/me      — auto-recovery on first dashboard load
 *   • POST /api/events       — last-line safety net when creating an event
 *
 * Idempotent and race-safe:
 *   1. Cheap path: if the user already has an OrgMember, return it.
 *   2. Create path: build Organisation + OrgMember in a single Prisma
 *      nested-create (atomic).
 *   3. Race path: if a parallel request beat us to the create, Prisma
 *      throws P2002 on the unique slug; we catch it, refetch by user,
 *      and return whichever org won the race.
 *
 * Profile.upsert is best-effort — if it fails, the org is still returned.
 * Profile is a denormalised cache of role/orgId; OrgMember is the truth.
 *
 * Does NOT touch Supabase Auth Admin API (JWT metadata sync). That stays in
 * the routes that have a reason to call it — it's an optional optimisation,
 * not part of the "ensure org exists" contract.
 */

import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export interface EnsureOrgInput {
  /** Supabase auth.users.id */
  supabaseUserId: string;
  /**
   * Preferred org name. Used as-is when present. When absent, we fall back
   * to userMetadata fields and finally to a generic "My Organisation".
   */
  orgName?:      string | null;
  /**
   * Optional user metadata, used to derive a fallback org name when
   * `orgName` is not provided. Typically `user.user_metadata` from
   * Supabase.
   */
  userMetadata?: Record<string, any> | null;
  /**
   * Optional user email, used as the last-resort fallback for org name.
   */
  userEmail?:    string | null;
}

export interface EnsureOrgResult {
  orgId:    string;
  orgName:  string;
  orgSlug:  string;
  /** True when the org already existed; false when this call created it. */
  existing: boolean;
}

const PROFILE_ROLE_DEFAULT = "organiser" as const;
const ORG_NAME_MAX_LEN     = 120;      // matches Organisation.name max safe value
const SLUG_RANDOM_SUFFIX_LEN = 4;

/**
 * Deterministic-ish fallback chain for org name. Returns a string
 * guaranteed to be non-empty and within schema length limits.
 */
function resolveOrgName({
  orgName,
  userMetadata,
  userEmail,
}: Pick<EnsureOrgInput, "orgName" | "userMetadata" | "userEmail">): string {
  const candidates = [
    orgName?.trim(),
    typeof userMetadata?.full_name === "string" ? userMetadata.full_name : null,
    typeof userMetadata?.name      === "string" ? userMetadata.name      : null,
    typeof userMetadata?.org_name  === "string" ? userMetadata.org_name  : null,
    userEmail ? userEmail.split("@")[0] : null,
    "My Organisation",
  ];
  const chosen = candidates.find((v) => typeof v === "string" && v.trim().length > 0)!;
  return String(chosen).trim().slice(0, ORG_NAME_MAX_LEN);
}

/**
 * Look up the user's primary (oldest) OrgMember + parent Organisation.
 * Returns null if the user has no membership yet.
 */
async function findExistingOrg(
  supabaseUserId: string
): Promise<{ orgId: string; orgName: string; orgSlug: string } | null> {
  const member = await (db as any).orgMember.findFirst({
    where:   { supabaseUserId },
    include: { org: true },
    orderBy: { org: { createdAt: "asc" } }, // stable choice when multiple
  }).catch(() => null);

  if (!member?.org) return null;
  return {
    orgId:   member.orgId,
    orgName: member.org.name,
    orgSlug: member.org.slug,
  };
}

/**
 * Generate a slug that is unique at this moment. Note: a parallel request
 * could still grab the same slug between our findUnique and the subsequent
 * create — that's handled by the P2002 catch in `ensureOrgForUser`.
 */
async function nextAvailableSlug(orgName: string): Promise<string> {
  const baseSlug = slugify(orgName) || "org";
  const clash = await db.organisation.findUnique({ where: { slug: baseSlug } }).catch(() => null);
  if (!clash) return baseSlug;
  return `${baseSlug}-${Math.random().toString(36).slice(2, 2 + SLUG_RANDOM_SUFFIX_LEN)}`;
}

/**
 * Best-effort Profile sync. Profile row is a denormalised cache — failures
 * here must not break the signup/recovery flow. We log and continue.
 */
async function syncProfile(supabaseUserId: string, orgId: string): Promise<void> {
  try {
    await db.profile.upsert({
      where:  { supabaseUserId },
      update: { role: PROFILE_ROLE_DEFAULT, orgId, updatedAt: new Date() },
      create: { supabaseUserId, role: PROFILE_ROLE_DEFAULT, orgId },
    });
  } catch (err: any) {
    console.warn("[ensureOrgForUser] profile upsert failed (non-fatal)", {
      userId:  supabaseUserId,
      orgId,
      message: err?.message,
    });
  }
}

// ── Main entry point ─────────────────────────────────────────────────────

export async function ensureOrgForUser(input: EnsureOrgInput): Promise<EnsureOrgResult> {
  const { supabaseUserId } = input;
  if (!supabaseUserId) {
    throw new Error("ensureOrgForUser: supabaseUserId is required");
  }

  // ── Fast path: already has a membership ───────────────────────────────
  const existing = await findExistingOrg(supabaseUserId);
  if (existing) {
    return { ...existing, existing: true };
  }

  // ── Slow path: derive name + slug, then create ────────────────────────
  const orgName  = resolveOrgName(input);
  const finalSlug = await nextAvailableSlug(orgName);

  try {
    const org = await db.organisation.create({
      data: {
        name:           orgName,
        slug:           finalSlug,
        plan:           "starter",
        payoutVerified: false,
        kycStatus:      "none",
        members: {
          // Atomic with the org create: either both succeed or neither do.
          create: { supabaseUserId, role: "owner" },
        },
      },
    });

    // Profile sync is best-effort — see syncProfile comment.
    await syncProfile(supabaseUserId, org.id);

    console.log("[ensureOrgForUser] created", {
      userId: supabaseUserId,
      orgId:  org.id,
      slug:   org.slug,
    });

    return { orgId: org.id, orgName: org.name, orgSlug: org.slug, existing: false };

  } catch (err: any) {
    // P2002 = Prisma unique constraint violation. Two possibilities:
    //   a) Slug clash with an unrelated org (rare; bumps slug uses random
    //      suffix above, but still possible). Retry once with a new slug.
    //   b) A parallel request for THIS user finished creating their org
    //      between our findExistingOrg() and our create(). Re-check
    //      OrgMember and return whatever they ended up with.
    if (err?.code === "P2002") {
      const raceWinner = await findExistingOrg(supabaseUserId);
      if (raceWinner) {
        console.log("[ensureOrgForUser] lost race, using existing org", {
          userId: supabaseUserId,
          orgId:  raceWinner.orgId,
        });
        return { ...raceWinner, existing: true };
      }

      // No member yet, so the clash was case (a): pure slug collision.
      // Retry once with a fresh random suffix. Don't loop — if this
      // also fails we surface the error so it's investigated.
      const retrySlug = `${slugify(orgName) || "org"}-${Math.random().toString(36).slice(2, 8)}`;
      const org = await db.organisation.create({
        data: {
          name:           orgName,
          slug:           retrySlug,
          plan:           "starter",
          payoutVerified: false,
          kycStatus:      "none",
          members: {
            create: { supabaseUserId, role: "owner" },
          },
        },
      });
      await syncProfile(supabaseUserId, org.id);

      console.log("[ensureOrgForUser] created on retry after slug clash", {
        userId: supabaseUserId,
        orgId:  org.id,
        slug:   org.slug,
      });
      return { orgId: org.id, orgName: org.name, orgSlug: org.slug, existing: false };
    }

    console.error("[ensureOrgForUser] failed", {
      userId:  supabaseUserId,
      message: err?.message,
      code:    err?.code,
    });
    throw err;
  }
}
