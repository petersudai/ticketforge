"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Eye, EyeOff, CheckCircle2, AlertTriangle, ScanLine, Loader2 } from "lucide-react";

const pwChecks = [
  { re: /.{8,}/,  label: "At least 8 characters" },
  { re: /[A-Z]/,  label: "One uppercase letter" },
  { re: /[0-9]/,  label: "One number" },
];

type InviteState =
  | { status: "loading" }
  | { status: "valid";   name: string; email: string; orgName: string }
  | { status: "invalid"; error: string }
  | { status: "success" };

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [invite,   setInvite]   = useState<InviteState>({ status: "loading" });
  const [name,     setName]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Validate token on mount
  useEffect(() => {
    fetch(`/api/staff/invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInvite({ status: "valid", name: data.name, email: data.email, orgName: data.orgName });
          setName(data.name); // pre-fill
        } else {
          setInvite({ status: "invalid", error: data.error ?? "Invalid invite link." });
        }
      })
      .catch(() => setInvite({ status: "invalid", error: "Could not load invite. Please try again." }));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!pwChecks.every(c => c.re.test(password))) {
      setError("Password doesn't meet all requirements.");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/staff/invite/accept", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password, name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setInvite({ status: "success" });
      // Redirect to login after short delay so they can read success screen
      setTimeout(() => { window.location.href = "/auth/login"; }, 2500);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    fontSize: 13, background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)", color: "#fff",
    outline: "none",
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-brand-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-heading font-bold text-[20px] tracking-tight text-white">TicketForge</span>
          </Link>
        </div>

        {/* ── Loading ── */}
        {invite.status === "loading" && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-white/40">Verifying your invite…</p>
          </div>
        )}

        {/* ── Invalid / expired ── */}
        {invite.status === "invalid" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="font-heading font-bold text-[22px] text-white mb-2">Invite not valid</h1>
            <p className="text-[13px] text-white/45 mb-6">{invite.error}</p>
            <p className="text-[12px] text-white/25">
              Contact your event organiser to send a new invite.
            </p>
          </div>
        )}

        {/* ── Success ── */}
        {invite.status === "success" && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="font-heading font-bold text-[24px] text-white mb-2">You're in!</h1>
            <p className="text-[13px] text-white/50 mb-1">Your account has been created.</p>
            <p className="text-[12px] text-white/30">Taking you to sign in…</p>
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mt-5" />
          </div>
        )}

        {/* ── Valid invite — accept form ── */}
        {invite.status === "valid" && (
          <>
            {/* Context card */}
            <div
              className="rounded-xl p-4 mb-6 flex items-start gap-3"
              style={{ background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)" }}
            >
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
                <ScanLine className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white mb-0.5">
                  {invite.orgName} has invited you
                </div>
                <div className="text-[11px] text-white/40 leading-relaxed">
                  You'll get scanner and check-in access for assigned events.
                  No dashboard or financial data access.
                </div>
              </div>
            </div>

            <h1 className="font-heading font-bold text-[22px] text-white text-center mb-1">
              Accept your invite
            </h1>
            <p className="text-[12px] text-white/40 text-center mb-6">
              Invite for <strong className="text-white/60">{invite.email}</strong>
            </p>

            <div className="rounded-2xl p-6" style={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-[12px] text-red-300">{error}</span>
                </div>
              )}

              <form onSubmit={handleAccept} className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-[11px] text-white/45 mb-1.5">Your name</label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Jane Kamau"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "rgba(108,92,231,0.6)")}
                    onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] text-white/45 mb-1.5">Set a password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"} required
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={e => (e.target.style.borderColor = "rgba(108,92,231,0.6)")}
                      onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                    <button
                      type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {pwChecks.map(c => (
                        <div key={c.label} className="flex items-center gap-1">
                          <CheckCircle2 className={`w-3 h-3 ${c.re.test(password) ? "text-emerald-400" : "text-white/15"}`} />
                          <span className={`text-[10px] ${c.re.test(password) ? "text-emerald-400" : "text-white/25"}`}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit" disabled={loading || !name || !password}
                  className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                  ) : (
                    "Accept Invite & Create Account"
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
