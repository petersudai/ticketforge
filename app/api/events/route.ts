export const dynamic = "force-dynamic";
/**
 * GET  /api/events — Organiser's own events only (scoped to their org)
 * POST /api/events — Create event in caller's org
 *
 * SECURITY: Every response is scoped to guard.orgId.
 * super_admin sees all events. organiser sees only their org's events.
 * orgId is resolved from the DB in requireOrganiser — cannot be spoofed.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import { randomBytes } from "crypto";

const CreateEventSchema = z.object({
  name:        z.string().min(1).max(200).trim(),
  slug:        z.string().optional(),
  date:        z.string().min(1),
  time:        z.string().optional().nullable(),
  venue:       z.string().optional().nullable(),
  organizer:   z.string().optional().nullable(),
  category:    z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  capacity:    z.number().int().positive().optional().nullable(),
  currency:    z.string().default("KES"),
  accent:      z.string().default("#6C5CE7"),
  bgImage:     z.string().optional().nullable(),
  mpesaSc:     z.string().optional().nullable(),
  published:   z.boolean().default(true),
  tiers:       z.array(z.object({
    name:         z.string().min(1),
    description:  z.string().optional().nullable(),
    price:        z.number().min(0),
    quantity:     z.number().int().min(0),
    capacity:     z.number().int().min(1).default(1),
    hidden:       z.boolean().default(false),
    sortOrder:    z.number().int().default(0),
    saleStartsAt: z.string().datetime().nullable().optional(),
    saleEndsAt:   z.string().datetime().nullable().optional(),
  })).optional().default([]),
});


export async function GET(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  try {
    let orgId = guard.orgId;

    // If the organiser has no org yet (signed up before DB was wired),
    // return empty list immediately — the auto-create happens on first POST.
    // Log it so we can track how many users are in this state.
    if (!orgId && guard.role !== "super_admin") {
      console.log("[GET /api/events] no org found for user", {
        userId: guard.user.id,
        role:   guard.role,
        note:   "user needs to create first event to auto-create org",
      });
      return NextResponse.json([]);
    }

    const where = guard.role === "super_admin" ? {} : { orgId: orgId! };

    const events = await db.event.findMany({
      where,
      include: {
        tiers:     { orderBy: { sortOrder: "asc" } },
        attendees: {
          select: {
            id: true, name: true, email: true, phone: true, seat: true,
            ticketId: true, payStatus: true, pricePaid: true,
            checkedIn: true, checkedInAt: true, emailSent: true,
            source: true, tierId: true, eventId: true, createdAt: true,
            tier: { select: { name: true, capacity: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(events);
  } catch (err) {
    console.error("[GET /api/events]", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const { tiers, slug, ...eventData } = parsed.data;
  let orgId = guard.orgId;

  // ── Onboarding gap fix ────────────────────────────────────────────
  // Users who signed up before the DB was wired have a Supabase account
  // but no Organisation or OrgMember record. Auto-create one now so they
  // can create events without going through onboarding again.
  if (!orgId && guard.role !== "super_admin") {
    try {
      const userName =
        guard.user.user_metadata?.full_name ??
        guard.user.user_metadata?.name ??
        guard.user.email?.split("@")[0] ??
        "My Organisation";

      const baseSlug = slugify(userName) || "org";
      const existingSlug = await db.organisation.findUnique({ where: { slug: baseSlug } }).catch(() => null);
      const finalOrgSlug = existingSlug
        ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
        : baseSlug;

      const newOrg = await db.organisation.create({
        data: {
          name:          userName,
          slug:          finalOrgSlug,
          plan:          "starter",
          payoutVerified: false,
          members: {
            create: { supabaseUserId: guard.user.id, role: "owner" },
          },
        },
      });

      // Also create / update Profile row
      await db.profile.upsert({
        where:  { supabaseUserId: guard.user.id },
        update: { orgId: newOrg.id, updatedAt: new Date() },
        create: { supabaseUserId: guard.user.id, role: "organiser", orgId: newOrg.id },
      }).catch(() => null);

      orgId = newOrg.id;

      console.log("[POST /api/events] auto-created org for existing user", {
        userId: guard.user.id,
        orgId:  newOrg.id,
        name:   newOrg.name,
      });
    } catch (err) {
      console.error("[POST /api/events] failed to auto-create org", err);
      return NextResponse.json(
        { error: "Could not create your organisation. Please contact support." },
        { status: 500 }
      );
    }
  }

  if (!orgId) {
    return NextResponse.json(
      { error: "No organisation found for your account." },
      { status: 400 }
    );
  }
  const baseSlug = slug || slugify(eventData.name) || "event";
  let finalSlug = baseSlug;
  const existing = await db.event.findFirst({ where: { orgId, slug: baseSlug } }).catch(() => null);
  if (existing) {
    finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  try {
    const event = await db.event.create({
      data: {
        ...eventData,
        slug:  finalSlug,
        orgId,
        tiers: {
          create: tiers.map((t, i) => {
            const { saleStartsAt, saleEndsAt, ...rest } = t;
            return {
              ...rest,
              sortOrder:    t.sortOrder ?? i,
              saleStartsAt: saleStartsAt ? new Date(saleStartsAt) : null,
              saleEndsAt:   saleEndsAt   ? new Date(saleEndsAt)   : null,
              inviteToken:  t.hidden ? randomBytes(24).toString("hex") : null,
            };
          }),
        },
      },
      include: {
        tiers:     { orderBy: { sortOrder: "asc" } },
        attendees: true,
      },
    });

    console.log("[POST /api/events] created", {
      eventId: event.id,
      orgId,
      userId:  guard.user.id,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "An event with this slug already exists." }, { status: 409 });
    }
    console.error("[POST /api/events]", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
