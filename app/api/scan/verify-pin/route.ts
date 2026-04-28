export const dynamic = "force-dynamic";
/**
 * POST /api/scan/verify-pin
 *
 * Verifies the scanner override PIN against the org's server-stored value.
 * Called by the scanner page instead of comparing against localStorage.
 *
 * Returns { valid: boolean } — never returns the actual PIN.
 * Rate-limiting is enforced client-side (3 attempts → 30s lockout).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireScanner } from "@/lib/api-auth";
import { z } from "zod";

const Schema = z.object({
  pin:     z.string().min(1).max(12),
  eventId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const guard = await requireScanner(req);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const { pin, eventId } = parsed.data;

  // Resolve the org for this event — verify the caller can see this event.
  const event = await db.event.findUnique({
    where:  { id: eventId },
    select: { orgId: true },
  }).catch(() => null);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // For non-super_admin, ensure the caller belongs to the event's org.
  if (guard.role !== "super_admin" && guard.orgId !== event.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await db.organisation.findUnique({
    where:  { id: event.orgId },
    select: { overridePin: true },
  }).catch(() => null);

  if (!org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  return NextResponse.json({ valid: pin === org.overridePin });
}
