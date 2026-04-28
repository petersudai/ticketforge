/**
 * lib/resend.ts — Transactional email via Resend
 *
 * Used for:
 *   1. Staff invitation emails (invite link + event details)
 *   2. Ticket delivery emails (confirmation + download link)
 *
 * Sender: onboarding@resend.dev (Resend sandbox — works out of the box)
 * Production upgrade: set RESEND_FROM_EMAIL=noreply@ticketforge.app
 * after verifying your domain in the Resend dashboard.
 *
 * Resend API docs: https://resend.com/docs
 * Free tier: 3,000 emails/month, 100/day
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const FROM_NAME      = process.env.RESEND_FROM_NAME  ?? "TicketForge";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Core send function ────────────────────────────────────────────────

interface SendEmailOptions {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    // Dev mode without key — log to console so you can test locally
    console.log(`[resend] No RESEND_API_KEY — email not sent`);
    console.log(`[resend] TO: ${opts.to}`);
    console.log(`[resend] SUBJECT: ${opts.subject}`);
    return { ok: true }; // non-fatal in dev
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [opts.to],
        subject: opts.subject,
        html:    opts.html,
        text:    opts.text,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = (body as any).message ?? `Resend error ${res.status}`;
      console.error("[resend] Send failed:", msg);
      return { ok: false, error: msg };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[resend] Network error:", err.message);
    return { ok: false, error: err.message };
  }
}

// ── Staff invitation email ────────────────────────────────────────────

export interface StaffInviteEmailParams {
  toEmail:   string;
  toName:    string;
  orgName:   string;
  eventNames: string[];
  inviteUrl: string;
  expiresIn?: string;
}

export async function sendStaffInviteEmail(params: StaffInviteEmailParams) {
  const { toEmail, toName, orgName, eventNames, inviteUrl, expiresIn = "48 hours" } = params;

  const eventList = eventNames.length > 0
    ? eventNames.map(n => `<li style="margin-bottom:4px;">${n}</li>`).join("")
    : "<li>All assigned events</li>";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f0f0f8;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:540px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#111118;padding:28px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:32px;height:32px;background:#6C5CE7;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-weight:900;font-size:16px;">T</span>
      </div>
      <span style="color:white;font-weight:700;font-size:16px;letter-spacing:-0.02em;">TicketForge</span>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h1 style="color:#1a1a2e;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.02em;">
        You've been invited to manage check-in
      </h1>
      <p style="color:#555;font-size:14px;margin:0 0 20px;line-height:1.6;">
        Hi <strong style="color:#1a1a2e;">${toName}</strong>,<br/>
        <strong style="color:#1a1a2e;">${orgName}</strong> has invited you to scan tickets and manage
        check-in for the following event${eventNames.length !== 1 ? "s" : ""}:
      </p>

      <!-- Event list -->
      <div style="background:#f8f8fc;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <ul style="margin:0;padding:0 0 0 16px;color:#1a1a2e;font-size:13px;font-weight:600;">
          ${eventList}
        </ul>
      </div>

      <!-- Access info -->
      <div style="background:#f0f0ff;border-left:3px solid #6C5CE7;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
        <p style="font-size:12px;color:#444;margin:0;line-height:1.6;">
          As a <strong>Gate Staff</strong> member you'll have scanner and check-in access only.
          You won't see financial data, attendee emails, or dashboard management tools.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${inviteUrl}"
           style="display:inline-block;background:#6C5CE7;color:#fff;text-decoration:none;
                  padding:13px 32px;border-radius:10px;font-size:14px;font-weight:700;
                  letter-spacing:-0.01em;">
          Accept Invitation →
        </a>
      </div>

      <p style="font-size:12px;color:#888;text-align:center;margin:0 0 4px;">
        This invitation expires in <strong>${expiresIn}</strong>.
      </p>
      <p style="font-size:12px;color:#aaa;text-align:center;margin:0;">
        If you didn't expect this invite, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8fc;padding:16px 32px;border-top:1px solid #e8e8f0;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">
        Powered by <strong>TicketForge</strong> · Africa's event ticketing platform
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${toName},\n\n${orgName} has invited you to manage check-in for: ${eventNames.join(", ")}.\n\nAccept your invitation: ${inviteUrl}\n\nThis link expires in ${expiresIn}.\n\n— TicketForge`;

  return sendEmail({
    to:      toEmail,
    subject: `${orgName} invited you to manage event check-in`,
    html,
    text,
  });
}

// ── Ticket delivery email ─────────────────────────────────────────────

export interface TicketDeliveryEmailParams {
  toEmail:    string;
  toName:     string;
  eventName:  string;
  eventDate:  string;
  eventTime?: string;
  eventVenue?: string;
  organizer?: string;
  ticketId:   string;
  tierName:   string;
  pricePaid:  number;
  currency:   string;
  accent?:    string;
  downloadUrl: string;
}

export async function sendTicketDeliveryEmail(params: TicketDeliveryEmailParams) {
  const {
    toEmail, toName, eventName, eventDate, eventTime, eventVenue,
    organizer, ticketId, tierName, pricePaid, currency,
    accent = "#6C5CE7", downloadUrl,
  } = params;

  const priceDisplay = pricePaid > 0
    ? `${currency} ${pricePaid.toLocaleString()}`
    : "Free";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f0f0f8;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:${accent};padding:32px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">
        TicketForge
      </div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.02em;">
        Your ticket is confirmed! 🎉
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#555;font-size:14px;margin:0 0 20px;line-height:1.6;">
        Hi <strong style="color:#1a1a2e;">${toName}</strong> — you're all set for
        <strong style="color:#1a1a2e;">${eventName}</strong>.
      </p>

      <!-- Event details -->
      <div style="background:#f8f8fc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e8e8f0;">
            <td style="padding:8px 0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;width:40%;">Event</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;">${eventName}</td>
          </tr>
          ${eventDate ? `<tr style="border-bottom:1px solid #e8e8f0;">
            <td style="padding:8px 0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Date</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;">${eventDate}</td>
          </tr>` : ""}
          ${eventTime ? `<tr style="border-bottom:1px solid #e8e8f0;">
            <td style="padding:8px 0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Time</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;">${eventTime}</td>
          </tr>` : ""}
          ${eventVenue ? `<tr style="border-bottom:1px solid #e8e8f0;">
            <td style="padding:8px 0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Venue</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;">${eventVenue}</td>
          </tr>` : ""}
          <tr style="border-bottom:1px solid #e8e8f0;">
            <td style="padding:8px 0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Ticket type</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;">${tierName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Amount paid</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a2e;">${priceDisplay}</td>
          </tr>
        </table>
      </div>

      <!-- Ticket ID -->
      <div style="background:#111118;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">
          Your Ticket ID
        </div>
        <div style="font-family:'Courier New',monospace;font-size:20px;font-weight:700;color:#a29cf4;letter-spacing:0.06em;">
          ${ticketId}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:8px;">
          Present at the entrance for entry
        </div>
      </div>

      <!-- Primary CTA -->
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${downloadUrl}"
           style="display:inline-block;background:${accent};color:#fff;text-decoration:none;
                  padding:14px 36px;border-radius:10px;font-size:14px;font-weight:700;">
          View &amp; Download Ticket →
        </a>
      </div>

      <!-- No account note -->
      <div style="background:#f8f8fc;border-radius:10px;padding:12px 16px;margin-bottom:20px;text-align:center;">
        <p style="font-size:12px;color:#888;margin:0;">
          No account required — your ticket link is permanent.<br/>
          Bookmark it or save this email for easy access.
        </p>
      </div>

      <p style="font-size:11px;color:#aaa;text-align:center;line-height:1.6;margin:0;">
        This ticket is non-transferable. One entry per ticket.<br/>
        Can't find your ticket? <a href="${APP_URL}/resend-ticket?ticketId=${ticketId}" style="color:${accent};">Resend to my email →</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8fc;padding:16px 32px;border-top:1px solid #e8e8f0;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">
        Powered by <strong>TicketForge</strong>${organizer ? ` · ${organizer}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${toName},\n\nYour ticket for ${eventName} is confirmed!\n\nTicket ID: ${ticketId}\nTier: ${tierName}\nDate: ${eventDate ?? "—"}\nVenue: ${eventVenue ?? "—"}\nAmount: ${priceDisplay}\n\nView & download your ticket: ${downloadUrl}\n\nNo account required — this link is your ticket. Bookmark it!\n\n— TicketForge${organizer ? ` · ${organizer}` : ""}`;

  return sendEmail({
    to:      toEmail,
    subject: `Your ticket for ${eventName} is confirmed ✓`,
    html,
    text,
  });
}

export { APP_URL };
