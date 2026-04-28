"use client";
/**
 * app/events/[slug]/page.tsx — Public event registration page
 *
 * DATA SOURCE: /api/public/events/[slug] (Postgres, not Zustand)
 * PURCHASE:    /api/public/register (writes Attendee to DB)
 *
 * SECURITY:
 *   - Hidden tiers are filtered by the API — never shown here
 *   - Exact inventory counts are NEVER shown to buyers
 *   - Smart availability labels only: Few Left / Selling Fast / Sold Out
 *   - No account required for ticket buyers
 */

import { use, useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────

type AvailStatus = "available" | "few_left" | "selling_fast" | "sold_out";
type SaleWindowStatus = "active" | "not_started" | "ended";

interface PublicTier {
  id:               string;
  name:             string;
  description?:     string;
  price:            number;
  capacity:         number;
  sortOrder:        number;
  soldOut:          boolean;
  availabilityStatus:  AvailStatus;
  saleWindowStatus:    SaleWindowStatus;
  saleStartsAt?:    string | null;
  saleEndsAt?:      string | null;
}

interface PublicEvent {
  id:          string;
  name:        string;
  slug:        string;
  date:        string;
  time?:       string;
  venue?:      string;
  organizer?:  string;
  category?:   string;
  description?: string;
  currency:    string;
  accent:      string;
  bgImage?:    string;
  capacity?:   number;
  tiers:       PublicTier[];
  soldOut:     boolean;
  attendeeCount: number;
}

// ── SVG icons ─────────────────────────────────────────────────────────

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="2" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 5.5h11M4.5 1v2M8.5 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1a4 4 0 0 1 4 4c0 3-4 7-4 7S2.5 8 2.5 5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6.5" cy="5" r="1.3" fill="currentColor" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  } catch { return d; }
}

function MetaRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{icon}{text}</span>;
}

// Smart availability badge — no exact numbers
function AvailBadge({ status }: { status: AvailStatus }) {
  const map: Record<AvailStatus, { label: string; bg: string; color: string } | null> = {
    available:    null,
    few_left:     { label: "🔥 Few Tickets Left", bg: "rgba(225,112,85,0.12)", color: "#e17055" },
    selling_fast: { label: "⚡ Selling Fast",      bg: "rgba(253,203,110,0.10)", color: "#fdcb6e" },
    sold_out:     { label: "Sold Out",             bg: "rgba(214,48,49,0.10)",  color: "#ff7675" },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "#06060e", padding: "4rem 2rem 2rem", textAlign: "center" }}>
      {[320, 200, 140].map((w, i) => (
        <div key={i} style={{ width: w, height: i === 0 ? 36 : 14, background: "rgba(255,255,255,0.06)", borderRadius: 8, margin: "0 auto 16px", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────

function SuccessScreen({ ticketId, name, event }: { ticketId: string; name: string; event: PublicEvent }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "#06060e" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,184,148,0.12)", border: "1.5px solid rgba(0,184,148,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 }}>You&apos;re registered!</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>Hi <strong style={{ color: "#fff" }}>{name}</strong>, your ticket for <strong style={{ color: "#fff" }}>{event.name}</strong> is confirmed.</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "1.5rem", marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Your Ticket ID</p>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 700, color: "#a29cf4", letterSpacing: "0.06em", marginBottom: 16 }}>{ticketId}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={`/ticket/${ticketId}`} style={{ flex: 1, display: "block", textAlign: "center", background: event.accent || "#6C5CE7", color: "#fff", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              View &amp; Download Ticket →
            </a>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          Check your email for the confirmation. No account required — bookmark your ticket link.
        </p>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/marketplace" style={{ fontSize: 13, color: "rgba(108,92,231,0.8)", textDecoration: "none" }}>← Back to events</a>
        </div>
      </div>
    </div>
  );
}

// ── Input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif",
};

// ── Main page ─────────────────────────────────────────────────────────

export default function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [event,    setEvent]   = useState<PublicEvent | null>(null);
  const [loading,  setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tierToken, setTierToken] = useState<string | null>(null);

  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [form,  setForm]  = useState({ name: "", email: "", phone: "", seat: "" });
  const [payState, setPayState] = useState<"idle"|"initiating"|"waiting"|"confirmed"|"failed">("idle");
  const [payMsg,   setPayMsg]   = useState("");
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null);

  // ── Fetch event from public API (pass invite token if present) ─────
  useEffect(() => {
    const token = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tier")
      : null;
    setTierToken(token);
    const url = token
      ? `/api/public/events/${slug}?tier=${encodeURIComponent(token)}`
      : `/api/public/events/${slug}`;
    fetch(url)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setEvent(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)  return <Skeleton />;

  if (notFound || !event) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#06060e" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Event not found</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>This event may have ended or the link is incorrect.</p>
          <a href="/marketplace" style={{ color: "#a29cf4", fontSize: 13 }}>← Browse all events</a>
        </div>
      </div>
    );
  }

  if (successTicketId) {
    return <SuccessScreen ticketId={successTicketId} name={form.name} event={event} />;
  }

  const visibleTiers = event.tiers;
  const tier = visibleTiers[selectedTierIdx];
  const isFree = !tier || tier.price === 0;
  // Event is fully unavailable only if every tier is sold out or outside its sale window
  const eventSoldOut = event.soldOut || visibleTiers.every(t => t.soldOut || t.saleWindowStatus !== "active");

  // Poll M-Pesa payment status
  // Poll our DB (via /api/mpesa/status) until the M-Pesa callback
  // has processed the payment and created the Attendee row.
  // The ticketId comes from the server response — we never generate it client-side.
  const pollPaymentStatus = async (reqId: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const r = await fetch(`/api/mpesa/status?checkoutRequestId=${reqId}`);
        const d = await r.json();

        if (d.status === "completed") {
          // Attendee was created server-side in the callback — just show the ticket
          setSuccessTicketId(d.ticketId);
          return;
        }
        if (d.status === "failed") {
          setPayState("failed");
          setPayMsg(d.resultDesc || "Payment failed. Please try again.");
          return;
        }
        // "pending" or "processing" — keep waiting
        setPayMsg(`Waiting for confirmation… (${i + 1}/30)`);
      } catch { /* continue polling */ }
    }
    setPayState("failed");
    setPayMsg("Payment timed out. If you were charged, your ticket will be emailed shortly — contact support.");
  };

  const handleRegister = async () => {
    if (!form.name.trim())  { setPayMsg("Please enter your full name"); return; }
    if (!form.email.trim()) { setPayMsg("Please enter your email address"); return; }
    if (!isFree && !form.phone.trim()) { setPayMsg("Please enter your M-Pesa phone number"); return; }
    if (eventSoldOut) { setPayMsg("This event is sold out"); return; }
    if (tier?.soldOut) { setPayMsg("This ticket tier is sold out. Please select another."); return; }
    if (tier?.saleWindowStatus === "not_started") { setPayMsg("Sales for this tier haven't started yet."); return; }
    if (tier?.saleWindowStatus === "ended")       { setPayMsg("Sales for this tier have ended."); return; }
    setPayMsg("");

    // Free registration
    if (isFree) {
      try {
        const r = await fetch("/api/public/register", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            eventId: event.id,
            tierId:  tier?.id ?? "",
            name:    form.name.trim(),
            email:   form.email.trim(),
            phone:   form.phone.trim(),
            seat:    form.seat.trim() || "",
          }),
        });
        const d = await r.json();
        if (!r.ok) { setPayMsg(d.error || "Registration failed."); return; }
        setSuccessTicketId(d.ticketId);
      } catch {
        setPayMsg("Registration failed. Please try again.");
      }
      return;
    }

    // Paid — M-Pesa STK Push
    // The server creates both PendingPayment and (on callback) Attendee.
    // The client only polls for status — it never creates the attendee directly.
    setPayState("initiating");
    setPayMsg("Initiating M-Pesa payment…");

    try {
      const r = await fetch("/api/mpesa", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          phone:         form.phone.trim(),
          amount:        tier.price,
          tierId:        tier.id,
          eventId:       event.id,
          eventName:     event.name,
          attendeeName:  form.name.trim(),
          attendeeEmail: form.email.trim(),
        }),
      });

      const d = await r.json();
      if (!r.ok) { setPayState("failed"); setPayMsg(d.error || "Failed to initiate payment."); return; }

      setPayState("waiting");
      setPayMsg("STK Push sent — check your phone and enter your M-Pesa PIN.");
      await pollPaymentStatus(d.checkoutRequestId);
    } catch {
      setPayState("failed");
      setPayMsg("Network error. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#06060e", color: "#f0f0f8", fontFamily: "'DM Sans',system-ui,sans-serif" }}>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", padding: "5rem 2rem 3.5rem", overflow: "hidden",
        background: event.bgImage
          ? `linear-gradient(to bottom, rgba(6,6,14,0.3), #06060e), url(${event.bgImage}) center/cover`
          : `linear-gradient(135deg, ${event.accent}18, ${event.accent}06)`,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {event.category && (
            <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: event.accent, background: `${event.accent}18`, padding: "3px 10px", borderRadius: 20, marginBottom: 12 }}>
              {event.category}
            </div>
          )}
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(26px,5vw,42px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 14 }}>
            {event.name}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
            <MetaRow icon={<CalIcon />} text={`${formatDate(event.date)}${event.time ? ` · ${event.time}` : ""}`} />
            {event.venue     && <MetaRow icon={<PinIcon />}  text={event.venue} />}
            {event.organizer && <MetaRow icon={<UserIcon />} text={`by ${event.organizer}`} />}
          </div>
          {event.description && (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 540 }}>
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 2rem 4rem" }}>

        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
          Select a ticket tier
        </p>

        {visibleTiers.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            No tickets available for this event.
          </div>
        )}

        {visibleTiers.map((t, i) => {
          const isSelected    = i === selectedTierIdx;
          const unavailable   = t.soldOut || t.saleWindowStatus !== "active";
          const saleWindowMsg = t.saleWindowStatus === "not_started"
            ? `Sales open ${t.saleStartsAt ? new Date(t.saleStartsAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "soon"}`
            : t.saleWindowStatus === "ended" ? "Sales closed" : null;

          return (
            <div
              key={t.id}
              onClick={() => !unavailable && setSelectedTierIdx(i)}
              style={{
                background: isSelected ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.04)",
                border: isSelected ? `1.5px solid rgba(108,92,231,0.5)` : "1px solid rgba(255,255,255,0.09)",
                borderRadius: 14, padding: "14px 16px", marginBottom: 10,
                cursor: unavailable ? "not-allowed" : "pointer",
                opacity: unavailable ? 0.45 : 1,
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{t.name}</span>
                    {isSelected && !unavailable && (
                      <span style={{ fontSize: 10, background: "rgba(108,92,231,0.25)", color: "#a29cf4", padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>Selected</span>
                    )}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                      {t.description}
                    </div>
                  )}
                  {(t.capacity ?? 1) > 1 && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                      Admits {t.capacity} people per ticket
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <AvailBadge status={t.availabilityStatus} />
                    {saleWindowMsg && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{saleWindowMsg}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0, marginLeft: 12 }}>
                  {t.price === 0 ? "Free" : `${event.currency} ${t.price.toLocaleString()}`}
                </div>
              </div>
            </div>
          );
        })}

        {/* Sold out banner */}
        {eventSoldOut && (
          <div style={{ background: "rgba(214,48,49,0.1)", border: "1px solid rgba(214,48,49,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#ff7675", textAlign: "center" }}>
            This event has reached capacity. No more tickets available.
          </div>
        )}

        {/* Registration form */}
        {!eventSoldOut && visibleTiers.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "1.5rem", marginTop: 16 }}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Your details</h3>

            {/* No account required notice */}
            <div style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.15)", borderRadius: 10, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              No account required — provide your email and we'll deliver your ticket instantly.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Full name *</label>
                <input style={inputStyle} type="text" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Email address *</label>
                <input style={inputStyle} type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>
                  Phone {!isFree ? "(M-Pesa) *" : "(optional)"}
                </label>
                <input style={inputStyle} type="tel" placeholder="e.g. 0712345678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Seat preference (optional)</label>
                <input style={inputStyle} type="text" placeholder="e.g. A-01" value={form.seat} onChange={e => setForm(f => ({ ...f, seat: e.target.value }))} />
              </div>
            </div>

            {/* M-Pesa info */}
            {!isFree && (
              <div style={{ background: "rgba(0,165,80,0.07)", border: "1px solid rgba(0,165,80,0.2)", borderRadius: 12, padding: "1rem", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Pay via</span>
                  <span style={{ background: "#00A550", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>M-PESA</span>
                  <span style={{ marginLeft: "auto", fontFamily: "'Syne',sans-serif", fontWeight: 700, color: "#55efc4", fontSize: 14 }}>
                    {event.currency} {tier?.price.toLocaleString()}
                  </span>
                </div>

                {payState === "idle" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {["Enter your M-Pesa registered phone number above", "Click the button below — an STK Push will appear on your phone", "Enter your M-Pesa PIN when prompted", "Your ticket arrives immediately after confirmation"].map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,165,80,0.25)", border: "1px solid rgba(0,165,80,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#55efc4", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {payState === "initiating" && (
                  <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Connecting to M-Pesa…
                  </div>
                )}

                {payState === "waiting" && (
                  <div style={{ textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>📱</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Check your phone</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{payMsg}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>Do not close this page</div>
                  </div>
                )}

                {payState === "failed" && (
                  <div style={{ background: "rgba(214,48,49,0.1)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, color: "#ff7675" }}>{payMsg}</div>
                  </div>
                )}
              </div>
            )}

            {payMsg && isFree && (
              <div style={{ fontSize: 12, color: "#ff7675", marginBottom: 10 }}>{payMsg}</div>
            )}

            <button
              onClick={handleRegister}
              disabled={payState === "initiating" || payState === "waiting" || !tier}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, fontSize: 14,
                fontWeight: 600, fontFamily: "'Syne',sans-serif", border: "none",
                cursor: payState === "initiating" || payState === "waiting" ? "not-allowed" : "pointer",
                background: payState === "initiating" || payState === "waiting" ? "rgba(255,255,255,0.06)" : isFree ? "#00b894" : "#00A550",
                color: "#fff", transition: "all 0.2s",
                opacity: payState === "initiating" || payState === "waiting" ? 0.6 : 1,
              }}
            >
              {payState === "initiating" ? "Connecting…"
                : payState === "waiting"    ? "Waiting for payment…"
                : isFree                    ? "Register for free →"
                : `Pay ${event.currency} ${tier?.price.toLocaleString()} with M-Pesa →`}
            </button>

            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", textAlign: "center", marginTop: 10 }}>
              Secure · Powered by Safaricom M-Pesa · Instant confirmation
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: rgba(108,92,231,0.6) !important; box-shadow: 0 0 0 3px rgba(108,92,231,0.12); }
      `}</style>
    </div>
  );
}
