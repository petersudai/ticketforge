"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpWithEmail, signInWithGoogle } from "@/lib/supabase";
import {
  Zap, Eye, EyeOff, AlertCircle, CheckCircle2,
  Mail, ArrowRight, Ticket, BarChart3, Smartphone,
} from "lucide-react";

const pwChecks = [
  { re: /.{8,}/,  label: "At least 8 characters" },
  { re: /[A-Z]/,  label: "One uppercase letter" },
  { re: /[0-9]/,  label: "One number" },
];

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

// Social proof / feature pills shown above the form
const PERKS = [
  { icon: Ticket,     label: "Sell tickets instantly" },
  { icon: Smartphone, label: "M-Pesa payments built-in" },
  { icon: BarChart3,  label: "Real-time analytics" },
];

export default function SignupPage() {
  const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

  const [showPw, setShowPw]     = useState(false);
  const [orgName, setOrgName]   = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  const inputCls = "w-full px-3 py-2.5 rounded-[10px] text-[13px] text-white placeholder:text-white/25 outline-none transition-all";
  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
  const focusIn  = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = "rgba(108,92,231,0.6)");
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = "rgba(255,255,255,0.1)");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!orgName.trim()) { setError("Please enter your organizer or brand name."); return; }
    if (!pwChecks.every(c => c.re.test(password))) {
      setError("Password doesn't meet all requirements below.");
      return;
    }

    setLoading(true);

    // Step 1: Create Supabase auth user
    const { data, error: authErr } = await signUpWithEmail(email, password, orgName.trim());

    if (authErr) {
      setLoading(false);
      const msg = authErr.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("An account with this email already exists. Sign in instead.");
      } else if (msg.includes("invalid email")) {
        setError("Please enter a valid email address.");
      } else if (msg.includes("password")) {
        setError("Password is too weak. Use at least 8 characters with a number and uppercase letter.");
      } else {
        setError(authErr.message || "Signup failed. Please try again.");
      }
      return;
    }

    const userId = data?.user?.id;

    // Step 2: Call server-side setup API to create Org + OrgMember + Profile.
    // This is NOT fire-and-forget — without it the user has no org
    // and cannot create events. We block navigation until it completes.
    if (userId) {
      try {
        const setupRes = await fetch("/api/auth/signup", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ supabaseUserId: userId, orgName: orgName.trim() }),
        });

        if (!setupRes.ok) {
          const setupErr = await setupRes.json().catch(() => ({}));
          console.error("[signup] Setup API failed:", setupErr);
          // Show the error but don't block login — user can still access dashboard
          // and the auto-create-org fallback in /api/events will recover.
          setError(`Account created but org setup failed: ${setupErr.error ?? "unknown error"}. You can still continue — we'll set up your organisation when you create your first event.`);
        }
      } catch (setupErr) {
        console.error("[signup] Setup API network error:", setupErr);
        // Network error — same recovery path as above
      }
    }

    setLoading(false);

    if (data?.user && !data.session) {
      // Email confirmation required
      setCheckEmail(true);
    } else if (data?.session) {
      // Auto-confirmed (email confirmation off in dev) → straight to dashboard
      window.location.href = "/dashboard";
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(`Google sign-up failed: ${err.message}`);
      setLoading(false);
    }
    // On success, Supabase redirects the browser to /auth/callback
  };

  // ── Check-email confirmation screen ──────────────────────────────────
  if (checkEmail) {
    return (
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8 opacity-70 hover:opacity-100 transition-opacity">
          <div className="w-9 h-9 rounded-[10px] bg-brand-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-heading font-bold text-[20px] text-white">TicketForge</span>
        </Link>
        <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center mx-auto mb-5">
          <Mail className="w-8 h-8 text-brand-400" />
        </div>
        <h1 className="font-heading font-bold text-[24px] text-white mb-2">Check your email</h1>
        <p className="text-[14px] text-white/50 mb-2">We sent a confirmation link to</p>
        <p className="font-medium text-white mb-6">{email}</p>
        <div className="rounded-xl p-4 text-left mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <ol className="space-y-2 text-[13px] text-white/60">
            <li className="flex gap-2"><span className="text-brand-400 font-bold shrink-0">1.</span> Open the email from TicketForge</li>
            <li className="flex gap-2"><span className="text-brand-400 font-bold shrink-0">2.</span> Click <strong className="text-white">Confirm your email</strong></li>
            <li className="flex gap-2"><span className="text-brand-400 font-bold shrink-0">3.</span> You'll land on your dashboard automatically</li>
          </ol>
        </div>
        <p className="text-[12px] text-white/30 mb-4">
          Didn't get it? Check spam. The link expires in 24 hours.
        </p>
        <Link href="/auth/login" className="text-[13px] text-brand-400 hover:text-brand-300 font-medium">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  // ── Main signup form ─────────────────────────────────────────────────
  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group mb-5">
          <div className="w-9 h-9 rounded-[10px] bg-brand-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-heading font-bold text-[20px] tracking-tight text-white">TicketForge</span>
        </Link>
        <h1 className="font-heading font-bold text-[26px] text-white mb-1.5 block">
          Start selling tickets today
        </h1>
        <p className="text-[13px] text-white/40">
          Free to start · No credit card required · Live in minutes
        </p>
      </div>

      {/* Perks row */}
      <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
        {PERKS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-white/40">
            <Icon className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            {label}
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6" style={{ background: "rgba(17,17,24,0.95)", border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Google OAuth */}
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
              <span className="text-[11px] text-white/25">or with email</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-[12px] text-red-300">{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3">
          {/* Field 1: Organizer / Brand Name */}
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">
              Organizer Name / Brand Name
            </label>
            <input
              type="text" autoComplete="organization" required
              value={orgName} onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Kenya Jazz Collective"
              className={inputCls} style={inputStyle}
              onFocus={focusIn} onBlur={focusOut}
            />
          </div>

          {/* Field 2: Email */}
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Email address</label>
            <input
              type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls} style={inputStyle}
              onFocus={focusIn} onBlur={focusOut}
            />
          </div>

          {/* Field 3: Password */}
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"} autoComplete="new-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pr-10`} style={inputStyle}
                onFocus={focusIn} onBlur={focusOut}
              />
              <button
                type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Password strength hints */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !orgName || !email || !password}
            className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-1"
          >
            {loading ? "Creating your account…" : (
              <><span>Create My Account</span><ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-[11px] text-white/20 text-center mt-4">
          By signing up you agree to our{" "}
          <Link href="/terms" className="text-white/35 hover:text-white/50">Terms</Link>{" "}
          &{" "}
          <Link href="/privacy" className="text-white/35 hover:text-white/50">Privacy Policy</Link>
        </p>
      </div>

      <p className="text-center text-[13px] text-white/35 mt-5">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">
          Sign in
        </Link>
      </p>

      {/* Attendee redirect */}
      <p className="text-center text-[12px] text-white/20 mt-3">
        Just here to attend events?{" "}
        <Link href="/marketplace" className="text-white/35 hover:text-white/50">
          Browse the marketplace →
        </Link>
      </p>
    </div>
  );
}
