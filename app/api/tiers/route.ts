export const dynamic = "force-dynamic";
/**
 * POST /api/tiers — Add a new tier to an existing event
 * Ownership enforced: event must belong to the calling organiser's org.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, prisma } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";
import { z } from "zod";
import { randomBytes } from "crypto";

const CreateTierSchema = z.object({
  eventId:      z.string().min(1),
  name:         z.string().min(1).max(80).trim(),
  description:  z.string().max(300).optional().nullable(),
  price:        z.number().min(0).max(1_000_000),
  quantity:     z.number().int().min(0).max(100_000),
  capacity:     z.number().int().min(1).max(100).default(1),
  hidden:       z.boolean().default(false),
  sortOrder:    z.number().int().default(0),
  saleStartsAt: z.string().datetime().optional().nullable(),
  saleEndsAt:   z.string().datetime().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateTierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 422 });
  }

  if (!prisma) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const event = await (prisma as any).event.findUnique({
    where: { id: parsed.data.eventId }, select: { orgId: true },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Compare against the caller's server-derived orgId, not client-supplied data.
  if (guard.role !== "super_admin" && event.orgId !== guard.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { saleStartsAt, saleEndsAt, ...rest } = parsed.data;
  const tier = await (prisma as any).tier.create({
    data: {
      ...rest,
      saleStartsAt: saleStartsAt ? new Date(saleStartsAt) : null,
      saleEndsAt:   saleEndsAt   ? new Date(saleEndsAt)   : null,
      // Auto-generate invite token for hidden tiers
      inviteToken:  parsed.data.hidden ? randomBytes(24).toString("hex") : null,
    },
  });
  return NextResponse.json(tier, { status: 201 });
}
