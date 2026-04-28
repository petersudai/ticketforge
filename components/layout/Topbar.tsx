"use client";

import { usePathname, useRouter } from "next/navigation";
import { clearUIStore } from "@/store/useStore";
import { useSidebar } from "@/store/useSidebar";
import { signOut } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Menu, LogOut, Sparkles } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":   "Dashboard",
  "/events":      "Events",
  "/attendees":   "Attendees",
  "/tickets":     "Tickets",
  "/email":       "Email",
  "/public-page": "Public Page",
  "/revenue":     "Revenue",
  "/analytics":   "Analytics",
  "/settings":    "Settings",
  "/team":        "Team",
  "/admin":       "Admin Hub",
};

export function Topbar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { toggle } = useSidebar();
  const { user }   = useAuth();

  const userEmail = user?.email ?? null;
  const isDemo    = userEmail === "demo@ticketforge.app";

  // Match the most specific prefix
  const title =
    PAGE_TITLES[pathname] ??
    PAGE_TITLES[
      Object.keys(PAGE_TITLES)
        .filter(k => pathname.startsWith(k) && k !== "/")
        .sort((a, b) => b.length - a.length)[0] ?? ""
    ] ??
    "TicketForge";

  const handleSignOut = async () => {
    clearUIStore();
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="h-[54px] bg-[#111118] border-b border-white/[0.07] flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.05] text-white/60 hover:text-white hover:bg-white/[0.09] transition-all shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <h1 className="font-heading font-bold text-[17px] md:text-[18px] tracking-tight leading-none">
          {title}
        </h1>

        {isDemo && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-[10px] font-semibold text-amber-400">
            <Sparkles className="w-3 h-3" />
            Demo
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#5a5a72]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
          <span className="hidden sm:inline">Live</span>
        </div>

        {/* User email + sign out */}
        {userEmail && (
          <div className="flex items-center gap-2">
            <span className="hidden md:block text-[11px] text-[#5a5a72] truncate max-w-[160px]">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#5a5a72] hover:text-white hover:bg-white/[0.06] transition-all"
              title={`Sign out (${userEmail})`}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
