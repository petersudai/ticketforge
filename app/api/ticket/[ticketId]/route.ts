export const dynamic = "force-dynamic";
/**
 * GET /api/ticket/[ticketId]
 *
 * Two modes based on ?format= query:
 *   (default) json   — returns ticket + attendee + event data for the ticket page
 *   html             — returns full ticket HTML for download/print
 *
 * Public endpoint — no auth required.
 * Tracks download count on each access.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateQRDataURL } from "@/lib/qr";
import { formatDate } from "@/lib/utils";

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
function safeColor(val: unknown, fallback = "#6C5CE7"): string {
  const s = String(val ?? "").trim();
  return HEX_COLOR.test(s) ? s : fallback;
}

type Params = { params: Promise<{ ticketId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { ticketId }    = await params;
  const { searchParams } = new URL(req.url);
  const format           = searchParams.get("format") ?? "json";

  // Fetch from DB — no fallback, DB is required
  let attendee: any;
  try {
    attendee = await db.attendee.findUnique({
      where:   { ticketId },
      include: {
        event: { include: { org: true } },
        tier:  true,
      },
    });
  } catch (err) {
    console.error("[GET /api/ticket/[ticketId]]", err);
    return NextResponse.json({ error: "Failed to look up ticket" }, { status: 500 });
  }

  if (!attendee) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const event = attendee.event;

  // Check expiry
  if (event?.date) {
    const midnight = new Date(event.date + "T23:59:59");
    if (new Date() > midnight) {
      return NextResponse.json(
        { error: "This ticket has expired. The event has ended." },
        { status: 410 }
      );
    }
  }

  // Track download (fire-and-forget)
  db.attendee.update({
    where: { ticketId },
    data:  { downloadCount: { increment: 1 }, lastDownloadAt: new Date() },
  }).catch(() => {});

  // ── JSON response (default — used by ticket page) ─────────────────
  if (format !== "html") {
    return NextResponse.json({
      attendee: {
        id:         attendee.id,
        name:       attendee.name,
        email:      attendee.email,
        phone:      attendee.phone,
        seat:       attendee.seat,
        ticketId:   attendee.ticketId,
        payStatus:  attendee.payStatus,
        pricePaid:  attendee.pricePaid,
        checkedIn:    attendee.checkedIn,
        checkInCount: attendee.checkInCount ?? 0,
        emailSent:    attendee.emailSent,
        tierId:       attendee.tierId,
        eventId:      attendee.eventId,
        createdAt:    attendee.createdAt,
        tier:         attendee.tier ? { name: attendee.tier.name, capacity: attendee.tier.capacity ?? 1 } : null,
      },
      event: {
        id:          event.id,
        name:        event.name,
        slug:        event.slug,
        date:        event.date,
        time:        event.time,
        venue:       event.venue,
        organizer:   event.organizer,
        category:    event.category,
        description: event.description,
        currency:    event.currency,
        accent:      event.accent,
        bgImage:     event.bgImage,
        orgPlan:     event.org?.plan ?? "starter",
      },
    });
  }

  // ── HTML response (for print / PDF download) ──────────────────────
  const qrDataURL = await generateQRDataURL(
    ticketId, event.name, attendee.name, event.date
  ).catch(() => "");

  const accent  = safeColor(event.accent);
  const bgImage = event.bgImage ? escapeHtml(event.bgImage) : null;

  const fields = [
    { label: "Date",    value: escapeHtml(formatDate(event.date)) },
    { label: "Time",    value: escapeHtml(event.time) || "—" },
    { label: "Venue",   value: escapeHtml(event.venue) || "—" },
    { label: "Seat",    value: escapeHtml(attendee.seat) || "Open seating" },
    { label: "Tier",    value: escapeHtml(attendee.tier?.name) || "General" },
    { label: "Payment", value: attendee.pricePaid > 0 ? `${escapeHtml(event.currency)} ${Number(attendee.pricePaid).toLocaleString()} ✓` : "Complimentary" },
  ];

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial,sans-serif; background: #0a0818; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
.ticket { width: 520px; max-width: 100%; border-radius: 20px; overflow: hidden; background: #0a0818; box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08); }
.accent-bar { height: 3px; background: ${accent}; }
.hero { position: relative; height: 160px; background: linear-gradient(135deg, ${accent}33, ${accent}11); display: flex; flex-direction: column; justify-content: flex-end; padding: 20px 24px; overflow: hidden; }
${bgImage ? `.hero-bg { position: absolute; inset: 0; object-fit: cover; width: 100%; height: 100%; opacity: 0.4; }` : ""}
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 20%, rgba(10,8,24,0.95) 100%); }
.hero-content { position: relative; z-index: 2; }
.event-name { font-size: 22px; font-weight: 800; color: #fff; line-height: 1.15; }
.tier-badge { display: inline-block; margin-top: 6px; background: ${accent}33; border: 1px solid ${accent}66; border-radius: 6px; padding: 3px 10px; font-size: 10px; font-weight: 700; color: ${accent}; }
.body { padding: 20px 24px; }
.attendee { font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 16px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.field-label { font-size: 9px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
.field-value { font-size: 12px; color: rgba(255,255,255,0.85); }
.divider { display: flex; align-items: center; margin: 0 -24px 20px; }
.notch { width: 18px; height: 18px; border-radius: 50%; background: #05040f; flex-shrink: 0; }
.dashes { flex: 1; border-top: 1.5px dashed rgba(255,255,255,0.12); }
.footer { display: flex; align-items: center; gap: 16px; }
.qr-wrap { background: #fff; border-radius: 10px; padding: 8px; flex-shrink: 0; }
.qr-img { display: block; width: 90px; height: 90px; }
.ticket-id { font-family: monospace; font-size: 14px; font-weight: 700; color: #a29cf4; letter-spacing: 0.05em; }
.footer-note { font-size: 10px; color: rgba(255,255,255,0.3); line-height: 1.5; margin-top: 6px; }
.branding { padding: 10px 24px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; margin-top: 16px; }
.branding-text { font-size: 10px; color: rgba(255,255,255,0.2); }
</style></head><body>
<div class="ticket">
  <div class="accent-bar"></div>
  <div class="hero">
    ${bgImage ? `<img src="${bgImage}" alt="" class="hero-bg"/>` : ""}
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="event-name">${escapeHtml(event.name)}</div>
      <div class="tier-badge">${escapeHtml(attendee.tier?.name) || "General"}</div>
    </div>
  </div>
  <div class="body">
    <div class="attendee">${escapeHtml(attendee.name)}</div>
    <div class="info-grid">
      ${fields.map(f => `<div><div class="field-label">${f.label}</div><div class="field-value">${f.value}</div></div>`).join("")}
    </div>
    <div class="divider"><div class="notch"></div><div class="dashes"></div><div class="notch"></div></div>
    <div class="footer">
      <div class="qr-wrap"><img src="${qrDataURL}" alt="QR" class="qr-img"/></div>
      <div>
        <div style="font-size:9px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Ticket ID</div>
        <div class="ticket-id">${escapeHtml(ticketId)}</div>
        <div class="footer-note">Present this QR at the entrance<br/>${(attendee.tier?.capacity ?? 1) > 1 ? `Admits ${escapeHtml(attendee.tier.capacity)} people` : "One entry per ticket"}</div>
      </div>
    </div>
  </div>
  <div class="branding"><span class="branding-text">ticketforge.app</span><span class="branding-text">⚡ TICKETFORGE</span></div>
</div>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
