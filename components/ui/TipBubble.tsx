"use client";

/**
 * components/ui/TipBubble.tsx
 *
 * A small, dismissable "white bubble" that explains what a section of the
 * UI does. Used to onboard new users without forcing a guided tour.
 *
 * Design intent:
 *   • Inline, not a popover — sits in the normal page flow, no DOM positioning.
 *   • Visible by default; once dismissed, never shown again for that user.
 *   • Dismissal is persisted to localStorage, keyed by user + tip id.
 *
 * Persistence model (matches OnboardingBanners.tsx):
 *   Logged-in users:  localStorage["tf_tip_<userId>_<tipId>"] = "1"
 *   Anonymous users:  localStorage["tf_tip_anon_<tipId>"]      = "1"
 *
 *   We don't lump every tip into one JSON blob so that adding a new tip
 *   later never accidentally re-dismisses or re-shows other tips on the
 *   same page.
 *
 * Hydration safety:
 *   The component returns null until useEffect runs on the client. This
 *   prevents SSR/CSR mismatch when localStorage says "dismissed" but the
 *   server-rendered HTML doesn't know that.
 *
 * Accessibility:
 *   • role="status" so screen readers announce the tip on first appearance
 *   • Dismiss button has aria-label
 *   • Sufficient colour contrast (white-ish text on dark background, or
 *     the inverse if `variant="light"`)
 */

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export interface TipBubbleProps {
  /** Unique id for this tip. Used as part of the localStorage key. */
  id:        string;
  /** Bold first line. Keep it short — under ~60 chars looks best. */
  title:     string;
  /** Supporting body copy. One or two sentences. */
  body:      string;
  /**
   * Visual variant.
   *   "light"  — white-ish background, dark text. Stands out on dark pages.
   *   "subtle" — translucent dark background, lighter text. Less attention-grabbing.
   * Default is "light" because the brief asked for "bubbles in white".
   */
  variant?:  "light" | "subtle";
  /** Optional extra Tailwind classes to layout this tip in its container. */
  className?: string;
}

const STORAGE_PREFIX = "tf_tip_";

function storageKey(userId: string | null, tipId: string): string {
  return `${STORAGE_PREFIX}${userId ?? "anon"}_${tipId}`;
}

export function TipBubble({
  id,
  title,
  body,
  variant   = "light",
  className = "",
}: TipBubbleProps) {
  // AuthProvider wraps the entire app in app/layout.tsx, and useAuth() has a
  // safe default of { user: null, ... } when no provider is present. So this
  // hook is always safe to call from any page — including /demo where the
  // user is anonymous; userId simply becomes null and we use the "anon" key.
  const { user } = useAuth();
  const userId   = user?.id ?? null;

  const [mounted,   setMounted]   = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // On first client render, check whether this tip has been dismissed.
  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(storageKey(userId, id)) === "1") {
        setDismissed(true);
      }
    } catch {
      // localStorage may be unavailable (private mode, SSR snapshots, etc.)
      // — in that case we simply show the tip every time, which is fine.
    }
  }, [userId, id]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey(userId, id), "1");
    } catch {
      // Best-effort; the in-memory state above still hides it for this session.
    }
  };

  // Don't render anything until we know whether the user has dismissed.
  // This avoids a flash of the tip on pages that have already dismissed it.
  if (!mounted || dismissed) return null;

  // ── Styling per variant ──────────────────────────────────────────────
  const containerStyle: React.CSSProperties =
    variant === "light"
      ? {
          background: "rgba(255,255,255,0.96)",
          color:      "#1a1a24",
          border:     "1px solid rgba(255,255,255,0.4)",
          boxShadow:  "0 6px 24px rgba(0,0,0,0.35)",
        }
      : {
          background: "rgba(255,255,255,0.05)",
          color:      "rgba(255,255,255,0.85)",
          border:     "1px solid rgba(255,255,255,0.1)",
        };

  const iconBg =
    variant === "light"
      ? "rgba(108,92,231,0.15)"
      : "rgba(108,92,231,0.18)";
  const iconColor = "#6C5CE7";

  const bodyColor =
    variant === "light"
      ? "rgba(26,26,36,0.65)"
      : "rgba(255,255,255,0.5)";

  const dismissColor =
    variant === "light"
      ? "rgba(26,26,36,0.35)"
      : "rgba(255,255,255,0.3)";

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${className}`}
      style={containerStyle}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: iconBg, color: iconColor }}
        aria-hidden="true"
      >
        <Lightbulb className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold leading-snug">
          {title}
        </div>
        <div
          className="text-[12px] mt-0.5 leading-relaxed"
          style={{ color: bodyColor }}
        >
          {body}
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/[0.06] transition-colors shrink-0"
        style={{ color: dismissColor }}
        aria-label="Dismiss tip"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
