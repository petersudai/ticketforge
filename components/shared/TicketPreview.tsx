"use client";

import { useEffect, useRef } from "react";
import { formatDate } from "@/lib/utils";
import type { Event, Attendee } from "@/store/useStore";

interface TicketPreviewProps {
  event: Event;
  attendee: Attendee;
  layout?: "dark" | "minimal" | "bold";
  showBarcode?: boolean;
  showLogo?: boolean;
  scale?: number;
  id?: string;
}

export function TicketPreview({
  event,
  attendee,
  layout = "dark",
  showBarcode = true,
  showLogo = true,
  id = "ticket-canvas",
}: TicketPreviewProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const isDark = layout !== "minimal";
  const isBold = layout === "bold";
  const accent = event.accent || "#6C5CE7";
  const bg = layout === "minimal" ? "#f8f8fc" : isBold ? accent : "#0a0818";
  const textCol = isDark ? "#ffffff" : "#1a1a2e";
  const subCol = isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.38)";
  const divCol = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";
  const notchBg = layout === "minimal" ? "#ede8e0" : "#0a0a0f";

  // Draw real QR code
  useEffect(() => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !attendee.ticketId) return;
    const qrData = `TICKETFORGE|ID:${attendee.ticketId}|EVENT:${event.name}|ATTENDEE:${attendee.name}|DATE:${formatDate(event.date)}`;
    import("qrcode").then(QRCode => {
      QRCode.default.toCanvas(canvas, qrData, {
        width: 90,
        margin: 1,
        color: { dark: "#1a1a2e", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
    }).catch(() => {
      // Fallback: draw placeholder grid
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, 90, 90);
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "8px monospace";
      ctx.fillText("QR CODE", 18, 48);
    });
  }, [attendee.ticketId, event.name, attendee.name, event.date]);

  // Barcode bar widths
  const barWidths = [3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 2, 3, 1, 2];
  let barX = 0;

  const fields = [
    ["Date", formatDate(event.date)],
    ["Time", event.time || "—"],
    ["Venue", event.venue || "—"],
    ["Seat", attendee.seat || "—"],
    ["Type", attendee.tier || "General"],
    ["Payment", attendee.payStatus === "paid" ? "Confirmed ✓" : attendee.payStatus === "free" ? "Complimentary" : "Pending"],
  ];

  return (
    <div
      id={id}
      style={{
        width: 540,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: bg,
        borderRadius: 18,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background image — more visible for premium feel */}
      {event.bgImage && isDark && !isBold && (
        <img
          src={event.bgImage}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.72 }}
        />
      )}
      {/* Dark overlay — layered gradient keeps text/QR fully readable */}
      {isDark && !isBold && (
        <>
          {/* Base dark layer — stronger at bottom where info sits */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(8,6,28,0.55) 0%, rgba(4,3,18,0.88) 55%, rgba(4,3,18,0.97) 100%)" }} />
          {/* Accent colour tint at top for brand depth */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140, background: `linear-gradient(to bottom, ${accent}22 0%, transparent 100%)`, zIndex: 1 }} />
          {/* Subtle vignette around edges */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, transparent 50%, rgba(0,0,0,0.35) 100%)", zIndex: 1 }} />
        </>
      )}

      {/* Accent bar */}
      <div style={{ height: 3, background: accent, position: "relative", zIndex: 3 }} />
      <div style={{ position: "relative", zIndex: 2, padding: "2rem" }}>
        {/* Logo row */}
        {showLogo && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 20, height: 20, background: accent, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 14 14" fill="none" style={{ width: 11, height: 11 }}>
                  <rect x="1" y="2.5" width="12" height="9" rx="2" stroke="white" strokeWidth="1.3" />
                  <path d="M1 6h12" stroke="white" strokeWidth="1.3" />
                  <circle cx="10" cy="9" r="1.5" fill="white" />
                </svg>
              </div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, color: subCol, letterSpacing: "0.06em" }}>
                TICKETFORGE
              </span>
            </div>
            <span style={{ fontSize: 10, color: subCol }}>{event.organizer || ""}</span>
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: textCol, flex: 1, paddingRight: "1rem", lineHeight: 1.2 }}>
            {event.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ background: `${accent}25`, border: `1px solid ${accent}55`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, color: accent, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              {attendee.tier || "General"}
            </div>
            {(event as any).tierCapacity > 1 && (
              <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>
                Admits {(event as any).tierCapacity}
              </div>
            )}
          </div>
        </div>

        {/* Attendee name */}
        <div style={{ fontSize: 15, color: isDark ? "rgba(255,255,255,0.88)" : textCol, marginBottom: "1.25rem" }}>
          {attendee.name}
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, color: subCol, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: textCol }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Perforated divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "0 -2rem 1.5rem" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: notchBg, flexShrink: 0 }} />
          <div style={{ flex: 1, borderTop: `1.5px dashed ${divCol}` }} />
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: notchBg, flexShrink: 0 }} />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {/* QR code */}
          <div style={{ background: "#fff", borderRadius: 10, padding: 8, flexShrink: 0 }}>
            <canvas ref={qrCanvasRef} width={90} height={90} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 9, color: subCol, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Ticket ID
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: isDark ? "#a29cf4" : accent, letterSpacing: "0.04em", marginBottom: 6 }}>
              {attendee.ticketId}
            </div>

            {/* Barcode */}
            {showBarcode && (
              <svg height="28" style={{ display: "block", marginBottom: 8 }}
                viewBox={`0 0 ${barWidths.reduce((s, w) => s + w * 2 + 1.5, 0)} 28`}>
                {barWidths.map((w, i) => {
                  const x = barX;
                  barX += w * 2 + 1.5;
                  return (
                    <rect
                      key={i}
                      x={x} y={Math.sin(i) * 3 + 1}
                      width={w * 2} height={18 + Math.cos(i) * 5}
                      fill={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"}
                      rx="0.5"
                    />
                  );
                })}
              </svg>
            )}

            <div style={{ fontSize: 10, color: subCol }}>
              Present at entrance · One entry per ticket
            </div>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div style={{ position: "absolute", bottom: 10, right: 14, fontFamily: "'DM Mono',monospace", fontSize: 9, color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", letterSpacing: "0.04em", zIndex: 10 }}>
        TICKETFORGE · {attendee.ticketId}
      </div>
    </div>
  );
}
