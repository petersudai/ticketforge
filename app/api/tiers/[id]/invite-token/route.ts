export const dynamic = "force-dynamic";
/**
 * POST /api/tiers/[id]/invite-token
 * Generates or regenerates a secure invite token for a hidden tier.
 * Returns the full invite URL so the organiser can copy and share it.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";
import { randomBytes } from "crypto";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  if (!prisma) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const tier = await (prisma as any).tier.findUnique({
    where:   { id },
    include: { event: { select: { orgId: true, slug: true } } },
  }).catch(() => null);

  if (!tier) return NextResponse.json({ error: "Tier not found" }, { status: 404 });

  if (guard.role !== "super_admin" && tier.event.orgId !== guard.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!tier.hidden) {
    return NextResponse.json({ error: "Invite tokens are only for hidden tiers." }, { status: 400 });
  }

  const inviteToken = randomBytes(24).toString("hex");
  await (prisma as any).tier.update({ where: { id }, data: { inviteToken } });

  const origin = req.headers.get("origin") ?? "";
  const inviteUrl = `${origin}/events/${tier.event.slug}?tier=${inviteToken}`;

  return NextResponse.json({ inviteToken, inviteUrl });
}
