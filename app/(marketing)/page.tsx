"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";
import {
  Play,
  Zap, QrCode, BarChart3, Mail, Globe, Shield,
  CheckCircle2, ChevronDown, Star, ArrowRight,
  Users, Ticket, TrendingUp, Smartphone, Clock,
  CreditCard, Lock, Sparkles,
} from "lucide-react";

// ── Animation keyframes ───────────────────────────────────────────────

function PageStyles() {
  return (
    <style>{`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(26px); }
        to   { opacity: 1; transform: translateY(0);    }
      }
      @keyframes floatY {
        0%, 100% { transform: translateY(0px);   }
        50%       { transform: translateY(-10px); }
      }
      @keyframes glowPulse {
        0%, 100% { opacity: 1;   }
        50%       { opacity: 0.5; }
      }
      /* Scroll-triggered reveal — toggled by JS adding .in-view */
      .reveal {
        opacity: 0;
        transform: translateY(22px);
        transition: opacity 0.6s cubic-bezier(0.4,0,0.2,1),
                    transform 0.6s cubic-bezier(0.4,0,0.2,1);
      }
      .reveal.in-view { opacity: 1; transform: translateY(0); }
    `}</style>
  );
}

// ── useInView — fires once when element enters viewport ───────────────

function useInView(threshold = 0.12) {
  const ref  = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Reveal wrapper — wraps any child with a scroll-triggered fade+rise ─

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`reveal${inView ? " in-view" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "linear-gradient(135deg, #a29cf4 0%, #6C5CE7 50%, #4834d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-[12px] text-brand-300 font-semibold tracking-wide mb-6">
      <Sparkles className="w-3 h-3" />
      {children}
    </div>
  );
}

function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center mb-16">
      <h2 className="font-heading font-extrabold text-[36px] md:text-[44px] tracking-tight leading-[1.1] text-white mb-4">
        {children}
      </h2>
      {sub && <p className="text-[16px] text-white/50 max-w-[520px] mx-auto leading-relaxed">{sub}</p>}
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-[64px] px-6 overflow-hidden">
      {/* Background glow — slow pulse keeps the hero breathing */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "radial-gradient(ellipse, rgba(108,92,231,0.18) 0%, transparent 70%)", borderRadius: "50%", animation: "glowPulse 5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 300, height: 300, background: "radial-gradient(ellipse, rgba(108,92,231,0.08) 0%, transparent 70%)", borderRadius: "50%", animation: "glowPulse 7s 1s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "30%", right: "10%", width: 250, height: 250, background: "radial-gradient(ellipse, rgba(0,165,80,0.06) 0%, transparent 70%)", borderRadius: "50%", animation: "glowPulse 6s 2s ease-in-out infinite" }} />
      </div>

      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-[12px] text-emerald-400 font-semibold mb-8"
          style={{ animation: "fadeInUp 0.5s ease both" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
          Now live — M-Pesa STK Push built in
        </div>

        {/* Headline */}
        <h1 className="font-heading font-extrabold text-[52px] md:text-[72px] lg:text-[84px] tracking-[-0.03em] leading-[0.95] text-white mb-6"
          style={{ animation: "fadeInUp 0.6s 0.1s ease both" }}>
          Sell tickets.<br />
          <GradientText>Get paid instantly.</GradientText>
        </h1>

        {/* Sub */}
        <p className="text-[18px] md:text-[20px] text-white/50 max-w-[600px] mx-auto leading-relaxed mb-10"
          style={{ animation: "fadeInUp 0.6s 0.22s ease both" }}>
          The ticketing platform built for African events. M-Pesa payments, scannable QR tickets, and real-time check-in analytics — all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
          style={{ animation: "fadeInUp 0.6s 0.34s ease both" }}>
          <Link
            href="/demo"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[15px] px-7 py-3.5 rounded-[12px] transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(108,92,231,0.3)]"
          >
            <Play className="w-4 h-4 fill-white" />
            Try live demo
          </Link>
          <Link
            href="/auth/signup"
            className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-white font-semibold text-[15px] px-7 py-3.5 rounded-[12px] transition-all duration-150"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-[13px] text-white/35"
          style={{ animation: "fadeInUp 0.6s 0.44s ease both" }}>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            No credit card required
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Free up to 100 tickets/month
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Set up in under 5 minutes
          </div>
        </div>
      </div>

      {/* Dashboard preview — outer div floats, inner div fades in */}
      <div className="relative z-10 mt-16 w-full max-w-5xl mx-auto px-4"
        style={{ animation: "floatY 5s 1.3s ease-in-out infinite" }}>
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]"
          style={{ background: "rgba(17,17,24,0.8)", backdropFilter: "blur(20px)", animation: "fadeInUp 0.7s 0.55s ease both" }}>
          {/* Fake toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
            <div className="flex gap-1.5">
              {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white/[0.06] rounded-md px-3 py-1 text-[11px] text-white/30 text-center max-w-[240px] mx-auto">
                ticketforge.app/dashboard
              </div>
            </div>
          </div>
          {/* Dashboard mockup */}
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total tickets", value: "2,847", up: "+12%", color: "#a29cf4" },
              { label: "Revenue (KES)", value: "847,500", up: "+23%", color: "#55efc4" },
              { label: "Checked in", value: "1,203", up: "42% rate", color: "#74b9ff" },
              { label: "Pending pay", value: "KES 24K", up: "8 events", color: "#fdcb6e" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] text-white/35 mb-2 uppercase tracking-wider font-heading">{s.label}</div>
                <div className="font-heading font-bold text-[18px] text-white mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-emerald-400">{s.up}</div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5">
            <div className="rounded-xl overflow-hidden border border-white/[0.06]">
              <div className="grid grid-cols-6 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.05] text-[10px] text-white/30 uppercase tracking-wider font-heading">
                {["Event", "Date", "Attendees", "Revenue", "Status", ""].map(h => <div key={h}>{h}</div>)}
              </div>
              {[
                { name: "Nairobi Jazz Night", date: "Sep 20", att: 284, rev: "KES 284,000", status: "Active" },
                { name: "Startup Summit KE", date: "Oct 4",  att: 612, rev: "KES 918,000", status: "Active" },
                { name: "AfroBeats Festival", date: "Oct 18", att: 89,  rev: "KES 44,500",  status: "Upcoming" },
              ].map(r => (
                <div key={r.name} className="grid grid-cols-6 px-4 py-3 border-b border-white/[0.04] text-[12px] hover:bg-white/[0.02] transition-colors">
                  <div className="text-white font-medium">{r.name}</div>
                  <div className="text-white/40">{r.date}</div>
                  <div className="text-white/60">{r.att}</div>
                  <div className="text-emerald-400 font-medium">{r.rev}</div>
                  <div><span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">{r.status}</span></div>
                  <div className="text-white/20 text-right">→</div>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to top, #06060e, transparent)" }} />
        </div>
      </div>
    </section>
  );
}

// ── Logos / Social proof ──────────────────────────────────────────────

function TrustBar() {
  const logos = ["Safaricom M-Pesa", "Vercel", "Next.js", "Prisma", "EmailJS", "jsQR"];
  return (
    <section className="py-16 border-y border-white/[0.05]">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-[12px] text-white/25 uppercase tracking-widest font-heading mb-8">Powered by trusted technology</p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {logos.map(l => (
            <div key={l} className="text-[13px] font-semibold text-white/20 hover:text-white/40 transition-colors font-heading tracking-tight">
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────

const features = [
  {
    icon: CreditCard,
    title: "M-Pesa STK Push",
    desc: "Attendees pay directly from their phone. STK Push sends a prompt instantly. No redirects, no friction.",
    color: "#00A550",
    tag: "Payments",
  },
  {
    icon: QrCode,
    title: "Instant QR tickets",
    desc: "Every attendee gets a unique scannable QR code. Download as PNG or PDF. Print-ready at any resolution.",
    color: "#6C5CE7",
    tag: "Tickets",
  },
  {
    icon: Smartphone,
    title: "Mobile gate scanner",
    desc: "Open the scanner on any phone. Scan QR codes live with the camera. Instant valid/invalid feedback.",
    color: "#0984e3",
    tag: "Check-in",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    desc: "Check-in rates, revenue by tier, scan timeline, no-show tracking. All updating live as your event runs.",
    color: "#fdcb6e",
    tag: "Analytics",
  },
  {
    icon: Mail,
    title: "Automated email delivery",
    desc: "Tickets emailed automatically after payment. Customise subject, message, and branding per event.",
    color: "#e17055",
    tag: "Email",
  },
  {
    icon: Globe,
    title: "Public event pages",
    desc: "Each event gets a shareable URL. Attendees register and pay without ever logging in.",
    color: "#a29cf4",
    tag: "Marketplace",
  },
  {
    icon: Users,
    title: "Multi-tier ticketing",
    desc: "Create Early Bird, General, VIP, VVIP tiers — each with its own price, quantity, and colour.",
    color: "#55efc4",
    tag: "Tiers",
  },
  {
    icon: Shield,
    title: "Anti-fraud protection",
    desc: "Each ticket has a unique ID. Duplicate scans are blocked at the gate with admin PIN override.",
    color: "#f0997b",
    tag: "Security",
  },
  {
    icon: TrendingUp,
    title: "Revenue dashboard",
    desc: "Gross revenue, platform fees, net payout, M-Pesa transaction log — all in one financial overview.",
    color: "#74b9ff",
    tag: "Revenue",
  },
];

function Features() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Everything you need</SectionLabel>
          <SectionHeading sub="From ticket creation to post-event analytics — every tool in one platform, built for how African events actually work.">
            Built for <GradientText>serious event organisers</GradientText>
          </SectionHeading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            // Stagger: 3-col grid → each col gets its own delay tier
            const delay = (i % 3) * 100 + Math.floor(i / 3) * 60;
            return (
              <Reveal key={f.title} delay={delay}>
              <div
                className="group relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] h-full"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `radial-gradient(ellipse at top left, ${f.color}08 0%, transparent 60%)` }} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${f.color}18` }}>
                      <Icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                    <span className="text-[10px] font-semibold text-white/25 tracking-widest font-heading">{f.tag}</span>
                  </div>
                  <h3 className="font-heading font-bold text-[16px] text-white mb-2">{f.title}</h3>
                  <p className="text-[13px] text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── How it works ─────────────────────────────────────────────────────

function HowItWorks() {
  const organiserSteps = [
    { n: "01", title: "Create your event", desc: "Set your event details, venue, date, and ticket tiers with custom pricing in under 5 minutes." },
    { n: "02", title: "Share your page", desc: "Get a unique event URL instantly. Share it on WhatsApp, social media, or embed it anywhere." },
    { n: "03", title: "Attendees pay via M-Pesa", desc: "Customers select a tier and pay with M-Pesa STK Push. Tickets are issued automatically." },
    { n: "04", title: "Scan at the gate", desc: "Open the scanner on your phone. Scan QR codes for instant entry. Real-time counts update live." },
  ];

  const attendeeSteps = [
    { n: "01", title: "Browse events", desc: "Discover events on the marketplace. Filter by category, date, and location." },
    { n: "02", title: "Choose your ticket", desc: "Pick a tier that suits your budget — Early Bird, General, or VIP." },
    { n: "03", title: "Pay with M-Pesa", desc: "Enter your phone number. An STK Push arrives instantly. Enter your PIN and you're done." },
    { n: "04", title: "Get your ticket", desc: "Your QR ticket is emailed immediately. Show it at the door — no printing needed." },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Simple by design</SectionLabel>
          <SectionHeading sub="Whether you're running an event or attending one, TicketForge makes it effortless.">
            How it <GradientText>works</GradientText>
          </SectionHeading>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* For organisers */}
          <div className="rounded-2xl p-7 border border-white/[0.08]" style={{ background: "rgba(108,92,231,0.05)" }}>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <span className="font-heading font-bold text-[15px] text-brand-300">For organisers</span>
            </div>
            <div className="space-y-6">
              {organiserSteps.map((s, i) => (
                <Reveal key={s.n} delay={i * 100}>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border border-brand-500/40 flex items-center justify-center text-[11px] font-bold font-heading text-brand-400 shrink-0">
                        {s.n}
                      </div>
                      {i < organiserSteps.length - 1 && <div className="w-px flex-1 bg-brand-500/15 mt-2 min-h-[24px]" />}
                    </div>
                    <div className="pb-6">
                      <div className="font-heading font-bold text-[14px] text-white mb-1">{s.title}</div>
                      <div className="text-[13px] text-white/45 leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* For attendees */}
          <div className="rounded-2xl p-7 border border-white/[0.08]" style={{ background: "rgba(0,165,80,0.04)" }}>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Ticket className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-heading font-bold text-[15px] text-emerald-300">For attendees</span>
            </div>
            <div className="space-y-6">
              {attendeeSteps.map((s, i) => (
                <Reveal key={s.n} delay={i * 100}>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border border-emerald-500/40 flex items-center justify-center text-[11px] font-bold font-heading text-emerald-400 shrink-0">
                        {s.n}
                      </div>
                      {i < attendeeSteps.length - 1 && <div className="w-px flex-1 bg-emerald-500/15 mt-2 min-h-[24px]" />}
                    </div>
                    <div className="pb-6">
                      <div className="font-heading font-bold text-[14px] text-white mb-1">{s.title}</div>
                      <div className="text-[13px] text-white/45 leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────

const plans = [
  {
    name: "Starter",
    price: "Free",
    sub: "Forever",
    desc: "Perfect for small events and first-time organisers.",
    features: ["Up to 100 tickets/month", "1 active event", "M-Pesa payments", "QR ticket generation", "Email delivery", "Basic analytics"],
    cta: "Get started free",
    ctaHref: "/auth/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: "KES 2,500",
    sub: "per month",
    desc: "For serious organisers running multiple events.",
    features: ["Unlimited tickets", "Unlimited events", "M-Pesa STK Push", "Custom branding", "Bulk ticket PDF", "Advanced analytics", "Priority support", "Custom email templates"],
    cta: "Start Pro trial",
    ctaHref: "/auth/signup",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "per month",
    desc: "For large-scale events and venue partners.",
    features: ["Everything in Pro", "White-label option", "Dedicated support", "Custom integrations", "SLA guarantee", "Team seats", "API access", "Revenue reporting"],
    cta: "Contact us",
    ctaHref: "mailto:hello@ticketforge.app",
    featured: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-28 px-6 border-t border-white/[0.05]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Simple pricing</SectionLabel>
          <SectionHeading sub="Start free. Scale as you grow. No hidden fees, no surprises.">
            Pricing that <GradientText>makes sense</GradientText>
          </SectionHeading>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div
              key={plan.name}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                background: plan.featured ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                border: plan.featured ? "1.5px solid rgba(108,92,231,0.4)" : "1px solid rgba(255,255,255,0.07)",
                position: "relative",
              }}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-500 text-white text-[11px] font-bold px-3 py-1 rounded-full font-heading tracking-wide">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="text-[11px] font-heading font-bold text-white/30 uppercase tracking-widest mb-3">{plan.name}</div>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="font-heading font-extrabold text-[32px] text-white tracking-tight">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-[13px] text-white/35 mb-1.5">{plan.sub}</span>}
                </div>
                <p className="text-[13px] text-white/40">{plan.desc}</p>
              </div>

              <div className="flex-1 space-y-2.5 mb-8">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-[13px] text-white/60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <a
                href={plan.ctaHref}
                className="text-center py-3 rounded-[10px] text-[13px] font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: plan.featured ? "#6C5CE7" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: plan.featured ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-white/25 mt-8">
          Platform fee of 2.5% applies on paid tickets. M-Pesa transaction fees from Safaricom apply separately.
        </p>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────

const testimonials = [
  {
    quote: "We sold 800 tickets in 3 hours for our festival. The M-Pesa integration is seamless — attendees love how instant it is.",
    name: "Wanjiru Kamau",
    role: "Festival Director, Nairobi",
    avatar: "WK",
    color: "#a29cf4",
  },
  {
    quote: "The gate scanner on my phone replaced a whole check-in team. We scanned 600 people in under 40 minutes.",
    name: "Daniel Ochieng",
    role: "Event Manager, Mombasa",
    avatar: "DO",
    color: "#55efc4",
  },
  {
    quote: "Revenue analytics helped me understand which ticket tier performs best. Doubled VIP sales for our next event.",
    name: "Amira Hassan",
    role: "Corporate Events, Nairobi",
    avatar: "AH",
    color: "#74b9ff",
  },
  {
    quote: "Setup took 4 minutes. Our public event page was live and we started getting registrations the same day.",
    name: "Kevin Mwangi",
    role: "Community Organiser, Kisumu",
    avatar: "KM",
    color: "#fdcb6e",
  },
  {
    quote: "Finally a ticketing platform that understands M-Pesa. No more chasing EFT payments or handling cash at the door.",
    name: "Fatuma Abdalla",
    role: "Concert Promoter, Mombasa",
    avatar: "FA",
    color: "#f0997b",
  },
  {
    quote: "The automatic email delivery with branded tickets makes us look incredibly professional to our attendees.",
    name: "James Kariuki",
    role: "Tech Conference Host, Nairobi",
    avatar: "JK",
    color: "#00b894",
  },
];

function Testimonials() {
  return (
    <section className="py-28 px-6 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Loved by organisers</SectionLabel>
          <SectionHeading sub="Join hundreds of event organisers across Kenya who trust TicketForge to run their events smoothly.">
            What organisers <GradientText>say</GradientText>
          </SectionHeading>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 100}>
              <div
                className="rounded-2xl p-6 h-full"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[14px] text-white/65 leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold font-heading" style={{ background: `${t.color}20`, color: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-white">{t.name}</div>
                    <div className="text-[11px] text-white/35">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Benefits split ─────────────────────────────────────────────────────

function Benefits() {
  return (
    <section className="py-28 px-6 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Organiser benefits */}
          <div className="rounded-2xl p-8 border border-brand-500/15" style={{ background: "rgba(108,92,231,0.04)" }}>
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center mb-6">
              <Zap className="w-5 h-5 text-brand-400" />
            </div>
            <h3 className="font-heading font-extrabold text-[26px] text-white mb-3">For organisers</h3>
            <p className="text-[14px] text-white/45 mb-8 leading-relaxed">Everything you need to run a professional event — from setup to settlement.</p>
            <div className="space-y-4">
              {[
                ["Create events in minutes", "Name, venue, date, tiers — done in under 5 minutes."],
                ["M-Pesa payments built in", "Collect payments instantly. No bank setup, no delays."],
                ["Real-time check-in tracking", "See exactly who's arrived. Update your team live."],
                ["Bulk ticket export", "Download all tickets as a single PDF before your event."],
                ["Post-event revenue report", "Gross, fees, net payout — download as CSV."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[13px] font-semibold text-white">{title}</div>
                    <div className="text-[12px] text-white/40 mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/auth/signup" className="mt-8 flex items-center gap-2 text-[13px] font-semibold text-brand-300 hover:text-brand-200 transition-colors">
              Create your first event <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Attendee benefits */}
          <div className="rounded-2xl p-8 border border-emerald-500/15" style={{ background: "rgba(0,165,80,0.04)" }}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-6">
              <Ticket className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-heading font-extrabold text-[26px] text-white mb-3">For attendees</h3>
            <p className="text-[14px] text-white/45 mb-8 leading-relaxed">A smooth, fast, trustworthy way to get your ticket and enjoy the event.</p>
            <div className="space-y-4">
              {[
                ["Pay with M-Pesa in seconds", "No bank card needed. Just your phone and your PIN."],
                ["Ticket delivered instantly", "QR code in your inbox the moment payment clears."],
                ["Never lose your ticket", "Your ticket ID is always retrievable from your email."],
                ["No hidden fees", "The price you see is the price you pay."],
                ["Fast gate entry", "QR scan takes under 2 seconds. No long queues."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[13px] font-semibold text-white">{title}</div>
                    <div className="text-[12px] text-white/40 mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/marketplace" className="mt-8 flex items-center gap-2 text-[13px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors">
              Browse events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────

function Stats() {
  return (
    <section className="py-20 px-6 border-t border-white/[0.05]" style={{ background: "linear-gradient(135deg, rgba(108,92,231,0.05) 0%, transparent 60%)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "50,000+", label: "Tickets issued", color: "#a29cf4" },
            { value: "KES 12M+", label: "Processed via M-Pesa", color: "#55efc4" },
            { value: "200+", label: "Events hosted", color: "#74b9ff" },
            { value: "99.9%", label: "Uptime SLA", color: "#fdcb6e" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <div className="font-heading font-extrabold text-[38px] md:text-[44px] tracking-tight mb-2" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[13px] text-white/35">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────

const faqs = [
  { q: "Do I need a Safaricom business account to use M-Pesa?", a: "For sandbox/testing, no. For live events collecting real payments, you need a Safaricom M-Pesa Express API account with a registered shortcode. We guide you through setup in our docs." },
  { q: "How quickly do attendees receive their tickets?", a: "Immediately after M-Pesa payment clears (usually under 10 seconds). The ticket is emailed via EmailJS with a QR code and unique ticket ID." },
  { q: "Can I scan tickets without internet at the venue?", a: "The scanner works offline for previously loaded events. We recommend a strong mobile data connection for real-time check-in counts." },
  { q: "What happens if an attendee loses their ticket email?", a: "Each ticket has a unique ID. Organisers can look up any attendee by name or ID in the dashboard and verify manually." },
  { q: "Is there a limit to how many ticket tiers I can create?", a: "No. Create as many tiers as needed — Early Bird, General, VIP, VVIP, Press, Student, Sponsor — each with its own price and quantity." },
  { q: "Can I refund tickets?", a: "Refunds are handled directly via M-Pesa's reversal API. We provide the transaction reference so you can process refunds from your Safaricom portal." },
  { q: "What file formats can I download tickets in?", a: "PNG (high-resolution, 3× retina) and PDF (A4 portrait, print-ready). Bulk export downloads all attendee tickets as a single multi-page PDF." },
  { q: "Do you support events outside Kenya?", a: "Yes — we support KES, USD, UGX, and TZS. M-Pesa covers Kenya, Tanzania, Uganda, and DRC. Stripe and other gateways can be added." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28 px-6 border-t border-white/[0.05]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>FAQ</SectionLabel>
          <SectionHeading sub="Everything you need to know before you start.">
            Common <GradientText>questions</GradientText>
          </SectionHeading>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border border-white/[0.07] transition-all duration-200"
              style={{ background: open === i ? "rgba(108,92,231,0.06)" : "rgba(255,255,255,0.02)" }}
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-[14px] font-semibold text-white pr-4">{faq.q}</span>
                <ChevronDown
                  className="w-4 h-4 text-white/40 shrink-0 transition-transform duration-200"
                  style={{ transform: open === i ? "rotate(180deg)" : "none" }}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-[13px] text-white/50 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-28 px-6 border-t border-white/[0.05]">
      <div className="max-w-3xl mx-auto text-center">
        <div className="relative rounded-3xl overflow-hidden p-12" style={{ background: "linear-gradient(135deg, rgba(108,92,231,0.2) 0%, rgba(72,52,212,0.15) 100%)", border: "1px solid rgba(108,92,231,0.25)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(108,92,231,0.3) 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-brand-500/20 border border-brand-500/30 rounded-full px-4 py-1.5 text-[12px] text-brand-300 font-semibold mb-6">
              <Sparkles className="w-3 h-3" />
              Free to start · No credit card
            </div>
            <h2 className="font-heading font-extrabold text-[38px] md:text-[48px] tracking-tight leading-[1.05] text-white mb-4">
              Ready to sell your<br /><GradientText>first ticket?</GradientText>
            </h2>
            <p className="text-[16px] text-white/45 mb-10 leading-relaxed">
              Join hundreds of Kenyan event organisers. Set up your event in minutes, share your link, and start collecting M-Pesa payments.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/demo"
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[15px] px-8 py-3.5 rounded-[12px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(108,92,231,0.35)]"
              >
                Try live demo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/marketplace"
                className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white font-semibold text-[15px] px-8 py-3.5 rounded-[12px] transition-all"
              >
                <Globe className="w-4 h-4 text-white/50" />
                Browse events
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Scroll watcher — isolated so useSearchParams is inside a Suspense ──

function ScrollWatcher() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const section = searchParams.get("scroll");
    if (!section) return;
    const el = document.getElementById(section);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, [searchParams]);
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <PageStyles />
      <Suspense fallback={null}><ScrollWatcher /></Suspense>
      <MarketingNav />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Stats />
      <Benefits />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <MarketingFooter />
    </>
  );
}
