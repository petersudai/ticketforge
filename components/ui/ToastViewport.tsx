"use client";

/**
 * components/ui/ToastViewport.tsx
 *
 * Renders all active toasts from the lib/toast store. Mount ONCE at the
 * app root (app/layout.tsx) — anywhere else creates duplicate viewports.
 *
 * Position:
 *   • Desktop (sm+): fixed bottom-right, max-width 380px
 *   • Mobile (xs):   fixed bottom, edge-to-edge with side padding
 *
 *   Bottom-right matches modern web app convention (Linear, Vercel, Slack)
 *   and stays clear of the dashboard sidebar (left) and Topbar (top).
 *
 * Accessibility:
 *   • role="region" with aria-live="polite" so screen readers announce
 *     new toasts without interrupting the user's current action
 *   • Individual toasts use role="alert" so errors are announced
 *   • Dismiss button is keyboard-focusable with aria-label
 *
 * Hydration:
 *   The viewport returns null until mounted on the client, matching the
 *   pattern in TipBubble.tsx. Toasts dispatched during SSR/initial paint
 *   would otherwise cause a mismatch.
 */

import { useEffect, useState } from "react";
import { useToastStore, type ToastVariant } from "@/lib/toast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

interface VariantStyle {
  border: string;
  glow:   string;
  color:  string;
  Icon:   React.ElementType;
}

const VARIANT: Record<ToastVariant, VariantStyle> = {
  success: { border: "rgba(0,184,148,0.4)",  glow: "rgba(0,184,148,0.08)",  color: "#55efc4", Icon: CheckCircle2  },
  error:   { border: "rgba(214,48,49,0.4)",  glow: "rgba(214,48,49,0.08)",  color: "#ff7675", Icon: AlertCircle   },
  info:    { border: "rgba(108,92,231,0.4)", glow: "rgba(108,92,231,0.08)", color: "#a29cf4", Icon: Info          },
  warning: { border: "rgba(253,203,110,0.4)", glow: "rgba(253,203,110,0.08)", color: "#fdcb6e", Icon: AlertTriangle },
};

export function ToastViewport() {
  const [mounted, setMounted] = useState(false);
  const toasts  = useToastStore(s => s.toasts);
  const dismiss = useToastStore(s => s.dismiss);

  useEffect(() => { setMounted(true); }, []);

  // Hydration-safe: don't render anything on the server.
  if (!mounted) return null;
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      // pointer-events-none on the outer container so the empty space
      // around toasts doesn't block clicks on the page beneath. Each
      // individual toast re-enables pointer events on itself.
      className="fixed z-[9999] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 flex flex-col gap-2 sm:max-w-[380px] sm:w-full pointer-events-none"
    >
      {toasts.map(t => {
        const v    = VARIANT[t.variant];
        const Icon = v.Icon;
        return (
          <div
            key={t.id}
            role="alert"
            className="flex items-start gap-3 rounded-xl px-4 py-3 pointer-events-auto animate-fade-in backdrop-blur-md"
            style={{
              // Solid dark background composed with the variant tint so
              // text contrast is consistent regardless of what's behind.
              background: `linear-gradient(rgba(17,17,24,0.96), rgba(17,17,24,0.96)), ${v.glow}`,
              border:     `1px solid ${v.border}`,
              boxShadow:  "0 12px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: v.glow, color: v.color }}
              aria-hidden="true"
            >
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 text-[13px] text-white leading-relaxed pt-0.5 break-words">
              {t.message}
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
