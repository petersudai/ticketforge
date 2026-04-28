export const dynamic = "force-dynamic";
/**
 * GET  /api/settings/pin  — returns whether a custom PIN is set (never the value)
 * PATCH /api/settings/pin — updates the org's override PIN
 *
 * Auth: organiser or above. PIN is stored on Organisation, not in localStorage.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganiser } from "@/lib/api-auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;
  if (!guard.orgId) return NextResponse.json({ error: "No organisation" }, { status: 400 });

  const org = await db.organisation.findUnique({
    where:  { id: guard.orgId },
    select: { overridePin: true },
  }).catch(() => null);

  if (!org) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

  return NextResponse.json({
    hasCustomPin: org.overridePin !== "1234",
    pinLength:    org.overridePin.length,
  });
}

const PinSchema = z.object({
  pin: z.string().min(4).max(12).regex(/^\d+$/, "PIN must be numeric"),
});

export async function PATCH(req: NextRequest) {
  const guard = await requireOrganiser(req);
  if (guard.error) return guard.error;
  if (!guard.orgId) return NextResponse.json({ error: "No organisation" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid PIN" },
      { status: 422 }
    );
  }

  await db.organisation.update({
    where: { id: guard.orgId },
    data:  { overridePin: parsed.data.pin },
  });

  return NextResponse.json({ ok: true });
}
