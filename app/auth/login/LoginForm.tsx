"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInWithEmail, signInWithGoogle } from "@/lib/supabase";
import { Zap, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();

  // Explicit ?next= destination, guarded against auth loops
  const rawNext      = searchParams.get("next") || "";
  const explicitNext = rawNext && !rawNext.startsWith("/auth/") ? rawNext : null;

  const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

  const [showPw,  setShowPw]  = useState(false);
  const [email,    setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState(() => {
    const urlError = searchParams.get("error");
    if (!urlError) return "";
    if (urlError === "exchange_failed") return "Google sign-in failed. Please try again.";
    if (urlError === "supabase_not_configured") return "Auth service not configured.";
    return urlError;
  });

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
  const focusIn  = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = "rgba(108,92,231,0.6)");
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = "rgba(255,255,255,0.1)");

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: err } = await signInWithEmail(email, password);

    if (err) {
      setLoading(false);
      setError(
        err.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : err.message
      );
      return;
    }

    if (!data?.session) {
      setLoading(false);
      setError(
        "Login succeeded but no session was created. " +
        "Ensure email confirmation is disabled in Supabase dashboard → Auth → Providers → Email."
      );
      return;
    }

    // Route by role after successful login.
    // window.location.href = full page reload so middleware runs with fresh cookies.
    const role = data.session.user.user_metadata?.role
               ?? data.session.user.app_metadata?.role
               ?? "organiser";

    let destination = explicitNext;
    if (!destination) {
      destination = role === "staff" ? "/scanner" : "/dashboard";
    }
    window.location.href = destination;
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(`Google sign-in failed: ${err.message}`);
      setLoading(false);
    }
    // On success Supabase redirects the browser — no manual push needed
  };

  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-[10px] bg-brand-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-heading font-bold text-[20px] tracking-tight text-white">TicketForge</span>
        </Link>
        <h1 className="font-heading font-bold text-[24px] text-white mt-6 mb-1.5">
          Organizer Sign In
        </h1>
        <p className="text-[13px] text-white/40">Welcome back — your events are waiting</p>
      </div>

      {/* Live demo CTA */}
      <a
        href="/demo"
        className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-500/30 hover:bg-brand-500/10 transition-all text-left block"
        style={{ background: "rgba(108,92,231,0.06)" }}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-brand-400" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-brand-300">Try the live demo</div>
          <div className="text-[11px] text-white/35">6-step walkthrough — no signup needed</div>
        </div>
        <div className="ml-auto text-[13px] text-brand-400 font-semibold">→</div>
      </a>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-[11px] text-white/25 font-medium">or sign in</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      <div className="rounded-2xl p-6" style={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Google */}
        {GOOGLE_ENABLED && (
          <>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-[10px] text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all mb-5 disabled:opacity-40"
              style={inputStyle}
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-[11px] text-white/25">or email</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-[12px] text-red-300">{error}</span>
          </div>
        )}

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Email address</label>
            <input
              type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-[10px] text-[13px] text-white placeholder:text-white/25 outline-none transition-all"
              style={inputStyle} onFocus={focusIn} onBlur={focusOut}
            />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-[11px] text-white/45">Password</label>
              <Link href="#" className="text-[11px] text-brand-400 hover:text-brand-300">Forgot?</Link>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"} autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 rounded-[10px] text-[13px] text-white placeholder:text-white/25 outline-none transition-all"
                style={inputStyle} onFocus={focusIn} onBlur={focusOut}
              />
              <button
                type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>

      <p className="text-center text-[13px] text-white/35 mt-5">
        New here?{" "}
        <Link href="/auth/signup" className="text-brand-400 hover:text-brand-300 font-medium">
          Start selling tickets →
        </Link>
      </p>

      <p className="text-center text-[12px] text-white/20 mt-2">
        Looking for an event?{" "}
        <Link href="/marketplace" className="text-white/35 hover:text-white/50">
          Browse the marketplace
        </Link>
      </p>
    </div>
  );
}
