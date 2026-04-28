"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Zap, Menu, X, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/supabase";
import { clearUIStore } from "@/store/useStore";
import { useAuth } from "@/lib/auth-context";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/demo",         label: "Live demo",     anchor: null },
  { href: "#features",    label: "Features",      anchor: "features" },
  { href: "#pricing",     label: "Pricing",       anchor: "pricing" },
  { href: "/marketplace", label: "Browse events", anchor: null },
];

function AccountMenu({ user }: { user: SupabaseUser }) {
  const [open, setOpen] = useState(false);
  const name     = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Account";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const role     = (user.user_metadata?.role ?? "organiser").replace("_", " ");

  const handleSignOut = async () => {
    clearUIStore();
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] hover:bg-white/[0.06] transition-all"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg,#6C5CE7,#a29cf4)" }}>
          {initials}
        </div>
        <span className="text-[13px] text-white/80 font-medium max-w-[110px] truncate hidden sm:block">
          {name.split(" ")[0]}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[210px] rounded-xl py-1.5 z-50"
            style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div className="px-3 py-2.5 border-b border-white/[0.07] mb-1">
              <div className="text-[12px] font-semibold text-white truncate">{name}</div>
              <div className="text-[10px] text-white/35 mt-0.5 capitalize">{role}</div>
            </div>
            <Link href="/dashboard" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-all">
              <LayoutDashboard className="w-4 h-4 text-brand-400" /> Dashboard
            </Link>
            <div className="h-px bg-white/[0.06] my-1" />
            <button onClick={async () => { clearUIStore(); await signOut(); window.location.href = "/"; }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/50 hover:text-red-400 hover:bg-red-500/[0.05] transition-all">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function MarketingNav() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const handleAnchorClick = (e: React.MouseEvent, anchor: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (pathname === "/") {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`/?scroll=${anchor}`);
    }
  };

  const isLoggedIn = !loading && user !== null;
  const isLoading  = loading;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(6,6,14,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
        <div className="max-w-7xl mx-auto px-6 h-[64px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[9px] bg-brand-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-heading font-bold text-[16px] tracking-tight">TicketForge</span>
            <span className="text-[9px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-bold tracking-widest">PRO</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(l => l.anchor ? (
              <a key={l.href} href={l.href} onClick={e => handleAnchorClick(e, l.anchor!)}
                className="px-4 py-2 text-[13px] text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all font-medium cursor-pointer">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href}
                className="px-4 py-2 text-[13px] text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all font-medium">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isLoading ? (
              <div className="w-24 h-8 rounded-[10px] bg-white/[0.04] animate-pulse" />
            ) : isLoggedIn ? (
              <>
                <Link href="/dashboard"
                  className="flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all font-medium">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </Link>
                <AccountMenu user={user as SupabaseUser} />
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-[13px] text-white/60 hover:text-white transition-colors font-medium px-3 py-1.5">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="text-[13px] font-semibold bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-[10px] transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Start free →
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.05] text-white/70" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#06060e] pt-[64px] flex flex-col px-6 py-6 gap-1">
          {NAV_LINKS.map(l => l.anchor ? (
            <a key={l.href} href={l.href} onClick={e => handleAnchorClick(e, l.anchor!)}
              className="text-[15px] text-white/70 hover:text-white py-3.5 border-b border-white/[0.06] font-medium cursor-pointer">
              {l.label}
            </a>
          ) : (
            <Link key={l.href} href={l.href} className="text-[15px] text-white/70 hover:text-white py-3.5 border-b border-white/[0.06] font-medium">
              {l.label}
            </Link>
          ))}
          <div className="mt-6 flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-center py-3 bg-brand-500 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <button onClick={async () => { clearUIStore(); await signOut(); window.location.href = "/"; }}
                  className="text-center py-3 border border-white/[0.15] rounded-xl text-[14px] font-medium text-white/60">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-center py-3 border border-white/[0.15] rounded-xl text-[14px] font-medium text-white/70">Sign in</Link>
                <Link href="/auth/signup" className="text-center py-3 bg-brand-500 rounded-xl text-[14px] font-semibold text-white">Start free →</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
