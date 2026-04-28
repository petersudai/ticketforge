"use client";

import { use, useState, useEffect, useRef, createRef } from "react";
import { createRoot } from "react-dom/client";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { TicketPreview } from "@/components/shared/TicketPreview";
import type { Event, Attendee } from "@/store/useStore";
import {
  Download, FileDown, QrCode, Calendar, MapPin,
  Ticket, CheckCircle2, AlertTriangle, Zap, Share2,
} from "lucide-react";

// ── Render TicketPreview (the admin design) to a canvas ───────────────
// This is the SINGLE SOURCE OF TRUTH: the exact same component used in
// the admin /tickets page is rendered here for download.
async function renderTicketPreviewToCanvas(
  event: Event,
  attendee: Attendee,
  layout: "dark" | "minimal" | "bold" = "dark"
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  // Mount a hidden TicketPreview into an off-screen container
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;z-index:-1;pointer-events:none;";
  document.body.appendChild(container);

  // Use React's createRoot to render the real component
  const root = createRoot(container);
  await new Promise<void>((resolve) => {
    root.render(
      <TicketPreview
        id="tf-download-canvas"
        event={event}
        attendee={attendee}
        layout={layout}
        showBarcode={true}
        showLogo={true}
      />
    );
    // Wait for QR code to render (useEffect fires after paint)
    setTimeout(resolve, 600);
  });

  const el = container.querySelector("#tf-download-canvas") as HTMLElement;
  if (!el) throw new Error("Ticket element not found");

  const canvas = await (html2canvas as any)(el, {
    scale: 3,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });

  root.unmount();
  document.body.removeChild(container);
  return canvas;
}

// ── Main page ─────────────────────────────────────────────────────────
export default function TicketDownloadPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);

  const [ticket,      setTicket]      = useState<any | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);
  const [shared,      setShared]      = useState(false);

  useEffect(() => {
    fetch(`/api/ticket/${ticketId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setTicket(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [ticketId]);

  // Destructure from API response. Normalize tier: API returns { name, color }
  // but TicketPreview expects a plain string for attendee.tier.
  const rawAttendee = ticket?.attendee ?? null;
  const attendee = rawAttendee
    ? {
        ...rawAttendee,
        tier: typeof rawAttendee.tier === "object"
          ? (rawAttendee.tier?.name ?? null)
          : rawAttendee.tier,
      }
    : null;
  // Expose tier capacity on the event object so TicketPreview can render "Admits N"
  const event = ticket?.event
    ? { ...ticket.event, tierCapacity: rawAttendee?.tier?.capacity ?? 1 }
    : null;

  const isExpired = event?.date
    ? new Date() > new Date(event.date + "T23:59:59")
    : false;

  // ── Download handlers ───────────────────────────────────────────────
  const handleDownloadPNG = async () => {
    if (!event || !attendee) return;
    setDownloading("png");
    try {
      const canvas = await renderTicketPreviewToCanvas(event, attendee);
      const link = document.createElement("a");
      link.download = `ticket-${ticketId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("PNG download failed:", e);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!event || !attendee) return;
    setDownloading("pdf");
    try {
      const canvas = await renderTicketPreviewToCanvas(event, attendee);
      const { jsPDF } = await import("jspdf");
      const imgData = canvas.toDataURL("image/png");
      const pw = 595;
      const ph = Math.round((canvas.height / canvas.width) * pw);
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [pw, ph] });
      pdf.addImage(imgData, "PNG", 0, 0, pw, ph);
      pdf.save(`ticket-${ticketId}.pdf`);
    } catch (e) {
      console.error("PDF download failed:", e);
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/ticket/${ticketId}`;
    if (navigator.share) {
      await navigator.share({
        title: event?.name || "My Ticket",
        text: `My ticket ID: ${ticketId}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Expired ─────────────────────────────────────────────────────────
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#06060e] flex flex-col items-center justify-center p-6">
        <LogoHeader />
        <div className="w-full max-w-[440px] text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="font-heading font-bold text-[22px] text-white mb-2">Ticket expired</h1>
          <p className="text-[14px] text-white/45 mb-6">
            This ticket is no longer downloadable — the event has ended.
            Keep your ticket ID as a record.
          </p>
          <div className="font-mono text-[16px] text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3 mb-6">
            {ticketId}
          </div>
          <Link href="/marketplace" className="text-[13px] text-brand-400 hover:text-brand-300">
            Browse upcoming events →
          </Link>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────
  if (notFound || !attendee || !event) {
    return (
      <div className="min-h-screen bg-[#06060e] flex flex-col items-center justify-center p-6">
        <LogoHeader />
        <div className="w-full max-w-[440px] text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-heading font-bold text-[22px] text-white mb-2">Ticket not found</h1>
          <p className="text-[14px] text-white/45 mb-2">
            We couldn&apos;t find ticket{" "}
            <span className="font-mono text-white/70">{ticketId}</span>.
          </p>
          <p className="text-[13px] text-white/30 mb-6">
            Check your confirmation email for your ticket ID and download link.
          </p>
          <Link href="/marketplace" className="text-[13px] text-brand-400 hover:text-brand-300">
            Browse events →
          </Link>
        </div>
      </div>
    );
  }

  // ── Valid ticket ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col items-center py-8 px-4">
      <LogoHeader />

      <div className="w-full max-w-[580px]">
        {/* Confirmed banner */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[13px] text-emerald-300 font-medium">
            Ticket confirmed — you&apos;re registered for{" "}
            <strong className="text-white">{event.name}</strong>!
          </span>
        </div>

        {/* ── THE TICKET — same TicketPreview used in admin /tickets page ── */}
        <div className="overflow-x-auto mb-5">
          <TicketPreview
            event={event}
            attendee={attendee}
            layout="dark"
            showBarcode={true}
            showLogo={true}
          />
        </div>

        {/* Download buttons */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={handleDownloadPNG}
            disabled={!!downloading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.1] hover:border-brand-500/40 hover:bg-brand-500/5 transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <Download className="w-5 h-5 text-brand-400" />
            <div className="text-center">
              <div className="text-[13px] font-semibold text-white">
                {downloading === "png" ? "Saving…" : "Save as image"}
              </div>
              <div className="text-[11px] text-white/35">PNG · Best for phones</div>
            </div>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={!!downloading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.1] hover:border-brand-500/40 hover:bg-brand-500/5 transition-all disabled:opacity-50 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <FileDown className="w-5 h-5 text-brand-400" />
            <div className="text-center">
              <div className="text-[13px] font-semibold text-white">
                {downloading === "pdf" ? "Saving…" : "Save as PDF"}
              </div>
              <div className="text-[11px] text-white/35">PDF · Print-ready A4</div>
            </div>
          </button>
        </div>

        {/* Share link */}
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] text-white/50 hover:text-white transition-colors mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {shared
            ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Link copied!</>
            : <><Share2 className="w-4 h-4" /> Share ticket link</>
          }
        </button>

        <p className="text-center text-[11px] text-white/20 leading-relaxed">
          You can re-download this ticket any time before the event ends.<br />
          Ticket ID: <span className="font-mono text-white/35">{ticketId}</span>
        </p>

        {/* Resend ticket */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
          <p className="text-[11px] text-white/25 mb-2">
            Can't find your ticket email?
          </p>
          <a
            href={`/resend-ticket?ticketId=${ticketId}`}
            className="text-[12px] text-brand-400 hover:text-brand-300 font-medium"
          >
            Resend to my email →
          </a>
        </div>

        {/* No account required note */}
        <div
          className="mt-4 rounded-xl px-4 py-3 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[11px] text-white/25 leading-relaxed">
            No account required — this link is your ticket.
            Bookmark it or save the email for easy access.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared logo header ─────────────────────────────────────────────────
function LogoHeader() {
  return (
    <Link href="/" className="flex items-center gap-2 mb-8 opacity-60 hover:opacity-100 transition-opacity">
      <div className="w-7 h-7 rounded-[8px] bg-brand-500 flex items-center justify-center">
        <Zap className="w-3.5 h-3.5 text-white fill-white" />
      </div>
      <span className="font-heading font-bold text-[15px] text-white">TicketForge</span>
    </Link>
  );
}
