"use client";
/**
 * store/useStore.ts — UI-only Zustand store
 *
 * ARCHITECTURE DECISION:
 * Zustand holds ONLY lightweight UI state that does not need a server round-trip.
 * Business data (events, attendees, scans, inventory) lives exclusively in
 * Supabase Postgres, accessed via API routes. No exceptions.
 *
 * What belongs here:
 *   overridePin   — scanner PIN (set once in Settings, used at gate)
 *   platformFee   — UI display setting
 *   (sidebar open/close state is in useSidebar.ts)
 *
 * What does NOT belong here:
 *   events, attendees, scans, tiers, inventory — these are in Postgres
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Types ─────────────────────────────────────────────────────────────
// Keep type exports so existing imports don't break during transition.
// Pages that still import these will get them from here but fetch data
// from the API. The types themselves describe the DB shape.

export interface Tier {
  id:            string;
  name:          string;
  description?:  string;
  price:         number;
  quantity:      number;
  capacity:      number; // people admitted per ticket (1 = solo, 2 = couple, etc.)
  hidden?:       boolean;
  sortOrder?:    number;
  saleStartsAt?: string | null;
  saleEndsAt?:   string | null;
  inviteToken?:  string | null;
}

export interface Attendee {
  id:           string;
  name:         string;
  email?:       string;
  phone?:       string;
  seat?:        string;
  ticketId:     string;
  payStatus:    "paid" | "free" | "pending";
  pricePaid:    number;
  checkedIn:     boolean;
  checkedInAt?:  string;
  checkInCount?: number;   // how many times scanned in (multi-use group tickets)
  emailSent:     boolean;
  tier?:         string;   // tier name (flattened from API for display)
  tierCapacity?: number;   // people per ticket (from tier.capacity)
  tierId?:       string;
  source:        string;
  eventId:      string;
  createdAt:    string;
}

export interface Event {
  id:           string;
  name:         string;
  slug:         string;
  date:         string;
  time?:        string;
  venue?:       string;
  organizer?:   string;
  category?:    string;
  description?: string;
  capacity?:    number;
  currency:     string;
  accent:       string;
  bgImage?:     string;
  mpesaSc?:     string;
  orgId?:       string;
  published?:   boolean;
  tiers:        Tier[];
  attendees:    Attendee[];
  createdAt:    string;
}

export interface Scan {
  id:            string;
  ticketId:      string;
  attendeeId?:   string;
  attendeeName?: string;
  attendeeTier?: string;
  eventId:       string;
  eventName:     string;
  result:        "valid" | "invalid" | "duplicate" | "override" | "over_capacity" | "cooldown" | "undone";
  entryNumber?:  number;
  scannerId?:    string;
  scannedAt:     string;
}

// ── UI store ──────────────────────────────────────────────────────────

interface UIStore {
  platformFee:    number;
  setPlatformFee: (fee: number) => void;
}

const uiStore = create<UIStore>()(
  persist(
    (set) => ({
      platformFee:    parseFloat(process.env.NEXT_PUBLIC_PLATFORM_FEE ?? "2.5"),
      setPlatformFee: (fee) => set({ platformFee: fee }),
    }),
    {
      name:    "ticketforge-ui",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * useStore() — returns UI-only state.
 *
 * For event/attendee/scan data, use the fetch hooks:
 *   useEvents()    → lib/hooks/useEvents.ts
 *   useAttendees() → lib/hooks/useAttendees.ts
 *   useScans()     → lib/hooks/useScans.ts
 */
export function useStore() {
  return uiStore();
}

export function clearUserStoreCache() {
  // No-op: UI store is not user-scoped (it holds only device preferences)
}

/** Alias used by Nav and Topbar on sign-out */
export function clearUIStore() {
  try { localStorage.removeItem("ticketforge-ui"); } catch { /* ignore */ }
  uiStore.setState({ platformFee: 2.5 });
}
