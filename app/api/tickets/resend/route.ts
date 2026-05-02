export const dynamic = "force-dynamic";
/**
 * POST /api/tickets/resend
 *
 * Resends a ticket confirmation email to the address on file.
 * Called from the /resend-ticket page. No auth required.
 *
 * Body: { ticketId, email? }
 * If email provided, must match ticket (privacy guard).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendTicketDeliveryEmail } from "@/lib/resend";
import { db as prisma } from "@/lib/db";

const ResendSchema = z.object({
  ticketId: z.string().min(1),
  email:    z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = ResendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const { ticketId, email } = parsed.data;

  const attendee = await (prisma as any).attendee.findUnique({
    where:   { ticketId },
    include: { event: { include: { org: true, tiers: true } } },
  }).catch(() => null);

  // Return success anyway to prevent ticket ID enumeration
  if (!attendee) {
    return NextResponse.json({ ok: true, message: "If that ticket exists, we've resent the email." });
  }

  // Email verification guard
  if (email && attendee.email && attendee.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ ok: true, message: "If that ticket exists, we've resent the email." });
  }

  if (!attendee.email) {
    return NextResponse.json(
      { error: "No email on file for this ticket. Contact the organiser." },
      { status: 400 }
    );
  }

  const event       = attendee.event;
  const tier        = event.tiers?.find((t: any) => t.id === attendee.tierId);
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const downloadUrl = `${appUrl}/ticket/${ticketId}`;

  await (prisma as any).attendee.update({
    where: { ticketId },
    data:  { downloadCount: { increment: 1 }, lastDownloadAt: new Date() },
  }).catch(() => {});

  const result = await sendTicketDeliveryEmail({
    toEmail:    attendee.email,
    toName:     attendee.name,
    eventName:  event.name,
    eventDate:  event.date ?? "",
    eventTime:  event.time ?? "",
    eventVenue: event.venue ?? "",
    organizer:  event.organizer ?? event.org?.name ?? "",
    ticketId,
    tierName:   tier?.name ?? "General Admission",
    pricePaid:  attendee.pricePaid ?? 0,
    currency:   event.currency ?? "KES",
    accent:     event.accent ?? "#6C5CE7",
    downloadUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
