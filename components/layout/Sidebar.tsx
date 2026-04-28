"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store/useSidebar";
import { canAccess, isSuperAdmin } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, CalendarDays, Users, Ticket, Mail,
  Globe, ScanLine, TrendingUp, BarChart3, Settings, Zap,
  ShoppingBag, X, ShieldCheck, UserPlus,
} from "lucide-react";

const ALL_NAV_ITEMS = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/events",      label: "Events",       icon: CalendarDays },
  { href: "/attendees",   label: "Attendees",    icon: Users },
  { href: "/tickets",     label: "Tickets",      icon: Ticket },
  { href: "/email",       label: "Email",        icon: Mail },
  { href: "/public-page", label: "Public Page",  icon: Globe },
  { href: "/revenue",     label: "Revenue",      icon: TrendingUp },
  { href: "/analytics",   label: "Analytics",    icon: BarChart3 },
  { href: "/team",        label: "Team",         icon: UserPlus },
  { href: "/settings",    label: "Settings",     icon: Settings },
];

function SidebarContent({ role, onNav }: { role: Role | null; onNav?: () => void }) {
  const pathname = usePathname();

  const navItems    = ALL_NAV_ITEMS.filter(({ href }) => canAccess(role, href));
  const showScanner = role === "super_admin" || role === "organiser" || role === "staff";
  const showAdmin   = isSuperAdmin(role);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link
        href="/"
        onClick={onNav}
        className="h-[54px] flex items-center gap-3 px-5 border-b border-white/[0.07] hover:opacity-80 transition-opacity shrink-0"
      >
        <div className="w-8 h-8 rounded-[9px] bg-brand-500 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <div>
          <div className="font-heading font-bold text-[15px] leading-none tracking-tight text-white">
            TicketForge
          </div>
          <div className="text-[9px] text-brand-400 font-semibold tracking-widest mt-0.5">PRO</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNav}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                isActive
                  ? "bg-[rgba(108,92,231,0.15)] text-brand-400"
                  : "text-[#9898b0] hover:text-[#f0f0f8] hover:bg-white/[0.04]"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                isActive ? "text-brand-400" : "text-[#5a5a72] group-hover:text-[#9898b0]"
              )} />
              {label}
            </Link>
          );
        })}

        <div className="h-px bg-white/[0.06] my-2" />

        {/* Super Admin Hub */}
        {showAdmin && (
          <Link
            href="/admin"
            onClick={onNav}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group",
              pathname.startsWith("/admin")
                ? "bg-[rgba(225,112,85,0.15)] text-[#e17055]"
                : "text-[#9898b0] hover:text-[#f0f0f8] hover:bg-white/[0.04]"
            )}
          >
            <ShieldCheck className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              pathname.startsWith("/admin") ? "text-[#e17055]" : "text-[#5a5a72] group-hover:text-[#9898b0]"
            )} />
            Admin Hub
            <span className="ml-auto text-[9px] bg-[#e17055]/20 text-[#e17055] px-1.5 py-0.5 rounded font-bold">
              SUPER
            </span>
          </Link>
        )}

        {/* Scanner — opens in new tab */}
        {showScanner && (
          <a
            href="/scanner"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNav}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#9898b0] hover:text-[#f0f0f8] hover:bg-white/[0.04] transition-all duration-150 group"
          >
            <ScanLine className="w-4 h-4 shrink-0 text-[#5a5a72] group-hover:text-[#9898b0] transition-colors" />
            Scanner
            <span className="ml-auto text-[10px] text-[#5a5a72]">↗</span>
          </a>
        )}

        {/* Marketplace */}
        <Link
          href="/marketplace"
          onClick={onNav}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#9898b0] hover:text-[#f0f0f8] hover:bg-white/[0.04] transition-all duration-150 group"
        >
          <ShoppingBag className="w-4 h-4 shrink-0 text-[#5a5a72] group-hover:text-[#9898b0] transition-colors" />
          Marketplace
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.07] space-y-2 shrink-0">
        <Link
          href="/"
          onClick={onNav}
          className="flex items-center gap-2 text-[11px] text-[#5a5a72] hover:text-[#9898b0] transition-colors"
        >
          ← Back to homepage
        </Link>
        <div className="flex items-center gap-2 text-[11px] text-[#5a5a72]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
          System operational
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { open, close } = useSidebar();
  const pathname        = usePathname();
  const { role } = useAuth();

  useEffect(() => { close(); }, [pathname, close]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else       document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 h-full bg-[#111118] border-r border-white/[0.07] flex-col">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-[#111118] border-r border-white/[0.07] flex flex-col transform transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={close}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent role={role} onNav={close} />
      </aside>
    </>
  );
}
