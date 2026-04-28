export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generateQRDataURL, buildQRString } from "@/lib/qr";
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

/**
 * POST /api/tickets/generate
 * Generates a printable ticket PDF server-side
 * Body: { ticketId, attendeeName, eventName, eventDate, eventTime, venue, tier, seat, accent, currency, price }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ticketId, attendeeName, eventName, eventDate, eventTime,
      venue, tier, seat, currency = "KES", pricePaid,
      showLogo = true, layout = "dark",
    } = body;
    const accent = safeColor(body.accent);

    if (!ticketId || !attendeeName || !eventName) {
      return NextResponse.json({ error: "Missing required fields: ticketId, attendeeName, eventName" }, { status: 400 });
    }

    // Generate QR code as data URL
    const qrDataURL = await generateQRDataURL(ticketId, eventName, attendeeName, eventDate || "");

    // Build the ticket HTML
    const isDark = layout !== "minimal";
    const bgColor = layout === "minimal" ? "#f8f8fc" : layout === "bold" ? accent : "#0a0818";
    const textColor = isDark ? "#ffffff" : "#1a1a2e";
    const subColor = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.38)";
    const dividerColor = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";

    const formattedDate = eventDate ? formatDate(eventDate) : "—";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0f0f0; display: flex; justify-content: center; padding: 32px; }
  .ticket {
    width: 580px;
    background: ${bgColor};
    border-radius: 20px;
    overflow: hidden;
    position: relative;
    font-family: 'DM Sans', sans-serif;
    page-break-inside: avoid;
  }
  .body { padding: 2rem; position: relative; z-index: 2; }
  .logo-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .logo { display: flex; align-items: center; gap: 7px; }
  .logo-icon { width: 20px; height: 20px; background: ${accent}; border-radius: 5px; display: flex; align-items: center; justify-content: center; }
  .logo-text { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; color: ${subColor}; letter-spacing: 0.06em; }
  .org { font-size: 10px; color: ${subColor}; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
  .event-name { font-family: 'Syne', sans-serif; font-size: 23px; font-weight: 800; color: ${textColor}; flex: 1; padding-right: 1rem; line-height: 1.2; }
  .tier-badge { background: ${accent}25; border: 1px solid ${accent}55; border-radius: 6px; padding: 4px 12px; font-size: 11px; font-weight: 600; color: ${accent}; letter-spacing: 0.04em; white-space: nowrap; }
  .attendee-name { font-size: 15px; color: ${isDark ? "rgba(255,255,255,0.88)" : textColor}; margin-bottom: 1.25rem; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
  .field-label { font-family: 'Syne', sans-serif; font-size: 9px; color: ${subColor}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
  .field-value { font-size: 12px; color: ${textColor}; }
  .divider { display: flex; align-items: center; margin: 0 -2rem 1.5rem; }
  .notch { width: 20px; height: 20px; border-radius: 50%; background: ${layout === "minimal" ? "#f0ede8" : "#0a0a0a"}; flex-shrink: 0; }
  .dash { flex: 1; border-top: 1.5px dashed ${dividerColor}; }
  .footer { display: flex; align-items: center; gap: 1.5rem; }
  .qr-wrap { background: #fff; border-radius: 10px; padding: 8px; flex-shrink: 0; }
  .qr-img { width: 90px; height: 90px; display: block; }
  .ticket-id-label { font-family: 'Syne', sans-serif; font-size: 9px; color: ${subColor}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .ticket-id { font-family: 'DM Mono', monospace; font-size: 13px; color: ${isDark ? "#a29cf4" : accent}; letter-spacing: 0.04em; margin-bottom: 8px; }
  .footer-note { font-size: 10px; color: ${subColor}; }
  .watermark { position: absolute; bottom: 10px; right: 14px; font-family: 'DM Mono', monospace; font-size: 9px; color: ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"}; letter-spacing: 0.04em; z-index: 3; }
  @media print {
    body { background: transparent; padding: 0; }
    .ticket { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="ticket">
  <div class="body">
    ${showLogo ? `
    <div class="logo-row">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 14 14" fill="none" style="width:11px;height:11px;"><rect x="1" y="2.5" width="12" height="9" rx="2" stroke="white" stroke-width="1.3"/><path d="M1 6h12" stroke="white" stroke-width="1.3"/><circle cx="10" cy="9" r="1.5" fill="white"/></svg>
        </div>
        <span class="logo-text">TICKETFORGE</span>
      </div>
      <span class="org">${escapeHtml(body.organizer)}</span>
    </div>` : ""}

    <div class="header">
      <div class="event-name">${escapeHtml(eventName)}</div>
      <div class="tier-badge">${escapeHtml(tier) || "General"}</div>
    </div>

    <div class="attendee-name">${escapeHtml(attendeeName)}</div>

    <div class="info-grid">
      <div><div class="field-label">Date</div><div class="field-value">${escapeHtml(formattedDate)}</div></div>
      <div><div class="field-label">Time</div><div class="field-value">${escapeHtml(eventTime) || "—"}</div></div>
      <div><div class="field-label">Venue</div><div class="field-value">${escapeHtml(venue) || "—"}</div></div>
      <div><div class="field-label">Seat / Section</div><div class="field-value">${escapeHtml(seat) || "—"}</div></div>
      <div><div class="field-label">Ticket type</div><div class="field-value">${escapeHtml(tier) || "General"}</div></div>
      <div><div class="field-label">Payment</div><div class="field-value">${pricePaid > 0 ? `${escapeHtml(currency)} ${Number(pricePaid).toLocaleString()}` : "Complimentary"}</div></div>
    </div>

    <div class="divider">
      <div class="notch"></div>
      <div class="dash"></div>
      <div class="notch"></div>
    </div>

    <div class="footer">
      <div class="qr-wrap">
        <img src="${qrDataURL}" alt="QR Code" class="qr-img" />
      </div>
      <div>
        <div class="ticket-id-label">Ticket ID</div>
        <div class="ticket-id">${escapeHtml(ticketId)}</div>
        <div class="footer-note">Present at entrance · One entry per ticket<br/>Do not share this code</div>
      </div>
    </div>
  </div>
  <div class="watermark">TICKETFORGE · ${escapeHtml(ticketId)}</div>
</div>
</body>
</html>`;

    // Return the HTML for client-side rendering + pdf generation
    // In production you could use puppeteer here for server-side PDF
    return NextResponse.json({
      html,
      qrDataURL,
      ticketId,
    });

  } catch (err: any) {
    console.error("Ticket generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate ticket" }, { status: 500 });
  }
}
