/**
 * lib/toast.ts
 *
 * App-wide toast notification system. Built on Zustand (already in deps —
 * no @radix-ui/react-toast complexity needed for our use case).
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *   toast.error("Failed to save event");
 *   toast.success("Tickets sent");
 *   toast.info("Check your email");
 *   toast.warning("M-Pesa is in maintenance");
 *   toast.dismiss(id);
 *   toast.clear();
 *
 * Default durations are tuned per-variant:
 *   • errors stay longer (7s) — users need time to read what went wrong
 *   • success/info are quick (4s) — confirmation only
 *
 * Pass `duration: 0` to make a toast persistent (must be dismissed manually).
 *
 * The visual rendering lives in components/ui/ToastViewport.tsx which must
 * be mounted ONCE at the app root. The store is a singleton — calling
 * toast.error() from any component dispatches to the same queue.
 */

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id:       string;
  variant:  ToastVariant;
  message:  string;
  /** ms; 0 = persistent (no auto-dismiss). */
  duration: number;
  createdAt: number;
}

interface ToastStore {
  toasts:  Toast[];
  show:    (variant: ToastVariant, message: string, duration?: number) => string;
  dismiss: (id: string) => void;
  clear:   () => void;
}

// ── Per-variant defaults ──────────────────────────────────────────────
const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info:    4000,
  warning: 5500,
  error:   7000,
};

// ── Internal: timer registry so we can cancel on manual dismiss ──────
// Map keys are toast IDs; values are timeout handles. Cleared when the
// toast is dismissed (manually or auto) to prevent leaks and double-dismiss.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(id: string) {
  const handle = timers.get(id);
  if (handle) {
    clearTimeout(handle);
    timers.delete(id);
  }
}

// ── Zustand store ─────────────────────────────────────────────────────
export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show: (variant, message, duration) => {
    // Crypto random id keeps collisions impossible even if many toasts
    // are queued in the same millisecond.
    const id  = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ms  = duration ?? DEFAULT_DURATION[variant];
    const t: Toast = { id, variant, message, duration: ms, createdAt: Date.now() };
    set(s => ({ toasts: [...s.toasts, t] }));

    if (ms > 0) {
      const handle = setTimeout(() => {
        get().dismiss(id);
      }, ms);
      timers.set(id, handle);
    }
    return id;
  },

  dismiss: (id) => {
    clearTimer(id);
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  },

  clear: () => {
    // Cancel all pending timers before clearing the queue.
    for (const id of timers.keys()) clearTimer(id);
    set({ toasts: [] });
  },
}));

// ── Public helper API ─────────────────────────────────────────────────
// Calling these is safe from anywhere — they read the singleton store
// state. No hooks, no provider, no context needed at the call site.
export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().show("success", msg, duration),
  error:   (msg: string, duration?: number) => useToastStore.getState().show("error",   msg, duration),
  info:    (msg: string, duration?: number) => useToastStore.getState().show("info",    msg, duration),
  warning: (msg: string, duration?: number) => useToastStore.getState().show("warning", msg, duration),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear:   ()           => useToastStore.getState().clear(),
};
