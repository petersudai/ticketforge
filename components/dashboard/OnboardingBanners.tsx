"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Zap, Phone, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * OnboardingBanners — Non-blocking setup nudges shown on the dashboard.
 *
 * Shown until dismissed (persisted to localStorage per user):
 *   1. M-Pesa payout setup — required before payouts are unlocked
 *   2. Phone number — for account recovery
 *
 * These never block access to the dashboard — they are helpful nudges only.
 */

interface Banner {
  id:     string;
  icon:   React.ReactNode;
  color:  string;
  title:  string;
  body:   string;
  cta:    string;
  href:   string;
}

const BANNERS: Banner[] = [
  {
    id:    "mpesa-setup",
    icon:  <CreditCard className="w-4 h-4" />,
    color: "#00A550",
    title: "Connect M-Pesa to unlock payouts",
    body:  "Add your Paybill or Till number in Settings to start receiving ticket revenue directly.",
    cta:   "Set up payouts →",
    href:  "/settings",
  },
  {
    id:    "phone-setup",
    icon:  <Phone className="w-4 h-4" />,
    color: "#6C5CE7",
    title: "Add your phone number",
    body:  "Required for M-Pesa payout notifications and account recovery.",
    cta:   "Add phone →",
    href:  "/settings",
  },
];

export function OnboardingBanners() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted,   setMounted]   = useState(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    setMounted(true);
    if (!userId) return;
    // Load dismissed state from localStorage keyed by user
    const key   = `tf_banners_${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setDismissed(new Set(JSON.parse(saved))); } catch {}
    }
  }, [userId]);

  const dismiss = (id: string) => {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    if (userId) {
      localStorage.setItem(`tf_banners_${userId}`, JSON.stringify([...next]));
    }
  };

  if (!mounted) return null;

  const visible = BANNERS.filter(b => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {visible.map(banner => (
        <div
          key={banner.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: `${banner.color}10`,
            border:     `1px solid ${banner.color}30`,
          }}
        >
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${banner.color}20`, color: banner.color }}
          >
            {banner.icon}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white">{banner.title}</div>
            <div className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{banner.body}</div>
          </div>

          {/* CTA + dismiss */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={banner.href}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: `${banner.color}20`,
                color:       banner.color,
                border:     `1px solid ${banner.color}30`,
              }}
            >
              {banner.cta}
            </Link>
            <button
              onClick={() => dismiss(banner.id)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
