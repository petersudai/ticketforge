import Link from "next/link";
import { Zap } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#06060e]">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-[8px] bg-brand-500 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="font-heading font-bold text-[15px]">TicketForge</span>
            </div>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-[240px]">
              The modern event ticketing platform built for Africa. M-Pesa native, instant QR tickets, real-time analytics.
            </p>
            <div className="flex items-center gap-1.5 mt-5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-white/30">All systems operational</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4 font-heading">Product</div>
            <div className="flex flex-col gap-2.5">
              {["Features", "Pricing", "Marketplace", "Scanner", "Analytics"].map(l => (
                <Link key={l} href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          </div>

          {/* Organizers */}
          <div>
            <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4 font-heading">Organizers</div>
            <div className="flex flex-col gap-2.5">
              {["Create event", "Ticket tiers", "M-Pesa setup", "Email delivery", "Dashboard"].map(l => (
                <Link key={l} href="/dashboard" className="text-[13px] text-white/50 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4 font-heading">Company</div>
            <div className="flex flex-col gap-2.5">
              {["About", "Blog", "Careers", "Privacy", "Terms"].map(l => (
                <Link key={l} href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-[12px] text-white/25">© {new Date().getFullYear()} TicketForge Pro. All rights reserved.</span>
          <div className="flex items-center gap-6">
            {["Twitter", "LinkedIn", "GitHub"].map(s => (
              <Link key={s} href="#" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">{s}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
