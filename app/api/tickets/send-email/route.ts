export const dynamic = "force-dynamic";
/**
 * POST /api/tickets/send-email
 *
 * Sends a ticket confirmation + download email to an attendee via Resend.
 * Called after successful M-Pesa payment or free ticket registration.
 *
 * No auth required — called from the public event checkout flow.
 * The ticketId is validated against the DB before sending.
 *
 * Body: { ticketId, toEmail, toName, eventName, eventDate, eventTime,
 *         eventVenue, organizer, tierName, pricePaid, currency, accent }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendTicketDeliveryEmail } from "@/lib/resend";
import { db as prisma } from "@/lib/db";

const SendTicketEmailSchema = z.object({
  ticketId:   z.string().min(1),
  toEmail:    z.string().email("Valid email required"),
  toName:     z.string().min(1).max(100),
  eventName:  z.string().min(1).max(200),
  eventDate:  z.string().optional().default(""),
  eventTime:  z.string().optional().default(""),
  eventVenue: z.string().optional().default(""),
  organizer:  z.string().optional().default(""),
  tierName:   z.string().optional().default("General Admission"),
  pricePaid:  z.number().min(0).default(0),
  currency:   z.string().default("KES"),
  accent:     z.string().optional().default("#6C5CE7"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = SendTicketEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // If DB is configured, verify the ticket exists before sending
  if (prisma) {
    const attendee = await (prisma as any).attendee
      .findUnique({ where: { ticketId: data.ticketId } })
      .catch(() => null);

    if (!attendee) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
  }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const downloadUrl = `${appUrl}/ticket/${data.ticketId}`;

  const result = await sendTicketDeliveryEmail({
    toEmail:    data.toEmail,
    toName:     data.toName,
    eventName:  data.eventName,
    eventDate:  data.eventDate,
    eventTime:  data.eventTime,
    eventVenue: data.eventVenue,
    organizer:  data.organizer,
    ticketId:   data.ticketId,
    tierName:   data.tierName,
    pricePaid:  data.pricePaid,
    currency:   data.currency,
    accent:     data.accent,
    downloadUrl,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to send email. Please check your ticket link." },
      { status: 500 }
    );
  }

  // Mark emailSent = true in DB if available
  if (prisma) {
    await (prisma as any).attendee.update({
      where: { ticketId: data.ticketId },
      data:  { emailSent: true },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, downloadUrl });
}
