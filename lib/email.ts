/**
 * Email delivery via EmailJS (client-side, no backend required)
 * Sign up free at emailjs.com — 200 emails/month
 *
 * Template variables used:
 *   {{to_email}}, {{to_name}}, {{event_name}}, {{event_date}},
 *   {{event_time}}, {{event_venue}}, {{ticket_id}}, {{ticket_type}},
 *   {{subject}}, {{custom_message}}, {{organizer}}
 */

export interface EmailParams {
  toEmail: string;
  toName: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  eventVenue?: string;
  organizer?: string;
  ticketId: string;
  ticketType: string;
  subject?: string;
  customMessage?: string;
}

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

/**
 * Send a single ticket email via EmailJS
 */
export async function sendTicketEmail(config: EmailJSConfig, params: EmailParams): Promise<void> {
  const { serviceId, templateId, publicKey } = config;

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: params.toEmail,
        to_name: params.toName,
        event_name: params.eventName,
        event_date: params.eventDate,
        event_time: params.eventTime || "—",
        event_venue: params.eventVenue || "—",
        organizer: params.organizer || "",
        ticket_id: params.ticketId,
        ticket_type: params.ticketType,
        subject: params.subject || `Your ticket for ${params.eventName} is ready!`,
        custom_message: params.customMessage || "",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`EmailJS error: ${errText}`);
  }
}

/**
 * Send ticket emails to multiple attendees with rate limiting
 */
export async function sendBulkTicketEmails(
  config: EmailJSConfig,
  attendees: EmailParams[],
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: string[] }> {
  let sent = 0;
  const failed: string[] = [];

  for (const attendee of attendees) {
    try {
      await sendTicketEmail(config, attendee);
      sent++;
      // EmailJS rate limit: ~1 per second on free tier
      await new Promise(r => setTimeout(r, 1100));
    } catch (err) {
      failed.push(attendee.toEmail);
      console.error(`Failed to send to ${attendee.toEmail}:`, err);
    }
    onProgress?.(sent, attendees.length);
  }

  return { sent, failed };
}

/**
 * Generate a branded HTML email body (for preview or custom SMTP)
 */
export function generateEmailHTML(params: Omit<EmailParams, "toEmail"> & { accentColor?: string }): string {
  const accent = params.accentColor || "#6C5CE7";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:${accent};padding:32px 32px 28px;text-align:center;">
      <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">TicketForge</div>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.02em;">Your ticket is ready!</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#555;font-size:14px;margin:0 0 20px;">Hi <strong style="color:#1a1a2e;">${params.toName}</strong>,</p>
      <p style="color:#333;font-size:14px;margin:0 0 24px;line-height:1.6;">
        You&apos;re all set for <strong style="color:#1a1a2e;">${params.eventName}</strong>. Here are your event details:
      </p>

      <!-- Event details grid -->
      <div style="background:#f8f8fc;border-radius:12px;padding:20px;margin-bottom:24px;display:grid;gap:12px;">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e8e8f0;padding-bottom:10px;">
          <span style="font-size:12px;color:#888;">Date</span>
          <span style="font-size:13px;font-weight:600;color:#1a1a2e;">${params.eventDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e8e8f0;padding-bottom:10px;">
          <span style="font-size:12px;color:#888;">Time</span>
          <span style="font-size:13px;font-weight:600;color:#1a1a2e;">${params.eventTime || "—"}</span>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e8e8f0;padding-bottom:10px;">
          <span style="font-size:12px;color:#888;">Venue</span>
          <span style="font-size:13px;font-weight:600;color:#1a1a2e;">${params.eventVenue || "—"}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:#888;">Ticket type</span>
          <span style="font-size:13px;font-weight:600;color:#1a1a2e;">${params.ticketType}</span>
        </div>
      </div>

      ${params.customMessage ? `<div style="border-left:3px solid ${accent};padding:10px 16px;margin-bottom:24px;background:#f8f8fc;border-radius:0 8px 8px 0;"><p style="font-size:13px;color:#555;font-style:italic;margin:0;">${params.customMessage}</p></div>` : ""}

      <!-- Ticket ID box -->
      <div style="background:#1a1a2e;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Ticket ID</div>
        <div style="font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:#a29cf4;letter-spacing:0.06em;">${params.ticketId}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:8px;">Present this at the entrance for entry</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="#" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:700;">View & Download Ticket →</a>
      </div>

      <p style="font-size:11px;color:#aaa;text-align:center;line-height:1.6;">
        This ticket is non-transferable. One entry per ticket. If you did not register for this event, please ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8fc;padding:16px 32px;text-align:center;border-top:1px solid #e8e8f0;">
      <p style="font-size:11px;color:#aaa;margin:0;">Powered by <strong>TicketForge</strong>${params.organizer ? ` · ${params.organizer}` : ""}</p>
    </div>
  </div>
</body>
</html>`;
}
