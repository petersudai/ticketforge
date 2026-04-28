"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Zap, Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";

function ResendForm() {
  const searchParams = useSearchParams();
  const [ticketId, setTicketId] = useState(searchParams.get("ticketId") ?? "");
  const [email,    setEmail]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    fontSize: 13, background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)", color: "#fff",
    outline: "none", fontFamily: "'DM Sans',system-ui,sans-serif",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) { setError("Please enter your ticket ID."); return; }
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/tickets/resend", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ticketId: ticketId.trim().toUpperCase(),
          email:    email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok && data.error) { setError(data.error); setLoading(false); return; }
      setDone(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="font-heading font-bold text-[22px] text-white mb-2">Email sent!</h2>
        <p className="text-[13px] text-white/50 mb-6 leading-relaxed">
          If we found a ticket with that ID, we've resent the confirmation email to the address on file. Check your spam folder too.
        </p>
        <Link href="/marketplace" className="text-[13px] text-brand-400 hover:text-brand-300 font-medium">
          Browse upcoming events →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-brand-400" />
        </div>
        <h1 className="font-heading font-bold text-[22px] text-white mb-1.5">Resend my ticket</h1>
        <p className="text-[13px] text-white/40">Enter your ticket ID and we'll email it again. No account needed.</p>
      </div>

      <div className="rounded-2xl p-6" style={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-[12px] text-red-300">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Ticket ID <span className="text-brand-400">*</span></label>
            <input
              type="text" required value={ticketId}
              onChange={e => setTicketId(e.target.value.toUpperCase())}
              placeholder="TF-XXXX-XXXXXX"
              style={{ ...inputStyle, fontFamily: "'DM Mono',monospace", letterSpacing: "0.04em" }}
              onFocus={e => (e.target.style.borderColor = "rgba(108,92,231,0.6)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            <p className="mt-1 text-[10px] text-white/25">Found in your confirmation email — starts with TF-</p>
          </div>

          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Email <span className="text-white/25">(optional — for verification)</span></label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="The email you used at checkout"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "rgba(108,92,231,0.6)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          <button
            type="submit" disabled={loading || !ticketId.trim()}
            className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-1"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><span>Resend my ticket</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[11px] text-white/25 text-center leading-relaxed">
            Your ticket link never expires. Bookmark <span className="text-white/40 font-mono">ticketforge.app/ticket/[ID]</span> for instant access.
          </p>
        </div>
      </div>

      <p className="text-center text-[12px] text-white/25 mt-5">
        Just browsing?{" "}
        <Link href="/marketplace" className="text-brand-400 hover:text-brand-300">Browse events →</Link>
      </p>
    </>
  );
}

export default function ResendTicketPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-brand-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-heading font-bold text-[18px] tracking-tight text-white">TicketForge</span>
          </Link>
        </div>
        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>}>
          <ResendForm />
        </Suspense>
      </div>
    </div>
  );
}
