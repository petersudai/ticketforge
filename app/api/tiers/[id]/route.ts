export const dynamic = "force-dynamic";
/**
 * PATCH  /api/tiers/[id] — Update a tier
 * DELETE /api/tiers/[id] — Delete a tier (only if no tickets sold)
 *
 * Ownership: caller must be a member of the org owning the event.
 * Super admin bypasses the org check.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";
import { z } from "zod";

const UpdateTierSchema = z.object({
  name:         z.string().min(1).max(80).trim().optional(),
  description:  z.string().max(300).nullable().optional(),
  price:        z.number().min(0).max(1_000_000).optional(),
  quantity:     z.number().int().min(0).max(100_000).optional(),
  capacity:     z.number().int().min(1).max(100).optional(),
  hidden:       z.boolean().optional(),
  sortOrder:    z.number().int().optional(),
  saleStartsAt: z.string().datetime().nullable().optional(),
  saleEndsAt:   z.string().datetime().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function assertTierOwnership(tierId: string, userId: string, role: string) {
  if (role === "super_admin") {
    const tier = await (prisma as any).tier.findUnique({ where: { id: tierId } }).catch(() => null);
    if (!tier) return { ok: false as const, status: 404, error: "Tier not found" };
    return { ok: true as const, tier };
  }

  const tier = await (prisma as any).tier.findUnique({
    where:   { id: tierId },
    include: { event: { select: { orgId: true } } },
  }).catch(() => null);

  if (!tier) return { ok: false as const, status: 404, error: "Tier not found" };

  const member = await (prisma as any).orgMember.findFirst({
    where: { supabaseUserId: userId, orgId: tier.event.orgId },
  }).catch(() => null);

  if (!member) return { ok: false as const, status: 403, error: "Forbidden" };

  return { ok: true as const, tier };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  if (!prisma) {
    let data: any = {};
    try { data = await req.json(); } catch {}
    return NextResponse.json({ id, ...data, local: true });
  }

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = UpdateTierSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${String(issue?.path?.[0] ?? "field")}: ${issue?.message ?? "invalid"}` },
      { status: 422 }
    );
  }

  const own = await assertTierOwnership(id, guard.user.id, guard.role);
  if (!own.ok) return NextResponse.json({ error: own.error }, { status: own.status });

  // Guard: quantity cannot be decreased below tickets already sold
  if (parsed.data.quantity !== undefined) {
    const soldCount = await (prisma as any).attendee.count({ where: { tierId: id } }).catch(() => 0);
    if (parsed.data.quantity < soldCount) {
      return NextResponse.json(
        { error: `Cannot set quantity below tickets already sold (${soldCount}).` },
        { status: 409 }
      );
    }
  }

  const { saleStartsAt, saleEndsAt, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if ("saleStartsAt" in parsed.data) updateData.saleStartsAt = saleStartsAt ? new Date(saleStartsAt) : null;
  if ("saleEndsAt"   in parsed.data) updateData.saleEndsAt   = saleEndsAt   ? new Date(saleEndsAt)   : null;

  try {
    const updated = await (prisma as any).tier.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PATCH /api/tiers/[id]]", err);
    if (err?.code === "P2025") return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    return NextResponse.json({ error: "Update failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;

  if (!prisma) {
    return NextResponse.json({ id, deleted: true, local: true });
  }

  const own = await assertTierOwnership(id, guard.user.id, guard.role);
  if (!own.ok) return NextResponse.json({ error: own.error }, { status: own.status });

  const soldCount = await (prisma as any).attendee.count({ where: { tierId: id } }).catch(() => 0);
  if (soldCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${soldCount} ticket(s) sold. Hide the tier instead.` },
      { status: 409 }
    );
  }

  try {
    await (prisma as any).tier.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/tiers/[id]]", err);
    if (err?.code === "P2025") return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
