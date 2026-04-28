"use client";
/**
 * useDemoStore — isolated Zustand store for the demo experience.
 * Uses the exact same shape as the real useStore but:
 *  - Never persisted to localStorage (no `persist` middleware)
 *  - Pre-seeded with realistic demo data on first access
 *  - Fully interactive — users can click everything, create events, check in etc.
 *  - Discarded on page refresh (keeps demo clean for every new visitor)
 */
import { create } from "zustand";
import { buildDemoData } from "./demoData";
import type { Event, Attendee, Scan } from "./useStore";

// Seed once at module level so it's consistent within a session
const SEED = buildDemoData();

interface DemoStore {
  events:      Event[];
  scans:       Scan[];
  overridePin: string;
  platformFee: number;
  isDemo:      true;

  addEvent:       (event: Event) => void;
  updateEvent:    (id: string, data: Partial<Event>) => void;
  deleteEvent:    (id: string) => void;
  getEvent:       (id: string) => Event | undefined;
  addAttendee:    (eventId: string, attendee: Attendee) => void;
  updateAttendee: (eventId: string, attendeeId: string, data: Partial<Attendee>) => void;
  removeAttendee: (eventId: string, attendeeId: string) => void;
  checkIn:        (eventId: string, ticketId: string, override?: boolean) => "valid" | "invalid" | "duplicate";
  addScan:        (scan: Scan) => void;
  setOverridePin: (pin: string) => void;
  setPlatformFee: (fee: number) => void;
  reset:          () => void;
}

export const useDemoStore = create<DemoStore>()((set, get) => ({
  events:      SEED.events,
  scans:       SEED.scans,
  overridePin: "1234",
  platformFee: 2.5,
  isDemo:      true,

  addEvent: (event) =>
    set(s => ({ events: [...s.events, event] })),

  updateEvent: (id, data) =>
    set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...data } : e) })),

  deleteEvent: (id) =>
    set(s => ({ events: s.events.filter(e => e.id !== id) })),

  getEvent: (id) => get().events.find(e => e.id === id),

  addAttendee: (eventId, attendee) =>
    set(s => ({
      events: s.events.map(e =>
        e.id === eventId ? { ...e, attendees: [...e.attendees, attendee] } : e
      ),
    })),

  updateAttendee: (eventId, attendeeId, data) =>
    set(s => ({
      events: s.events.map(e =>
        e.id === eventId
          ? { ...e, attendees: e.attendees.map(a => a.id === attendeeId ? { ...a, ...data } : a) }
          : e
      ),
    })),

  removeAttendee: (eventId, attendeeId) =>
    set(s => ({
      events: s.events.map(e =>
        e.id === eventId
          ? { ...e, attendees: e.attendees.filter(a => a.id !== attendeeId) }
          : e
      ),
    })),

  checkIn: (eventId, ticketId, override = false) => {
    const event = get().events.find(e => e.id === eventId);
    if (!event) return "invalid";
    const attendee = event.attendees.find(a => a.ticketId === ticketId);
    if (!attendee) return "invalid";
    if (attendee.checkedIn && !override) return "duplicate";
    get().updateAttendee(eventId, attendee.id, {
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
    });
    return "valid";
  },

  addScan: (scan) =>
    set(s => ({ scans: [...s.scans, scan] })),

  setOverridePin: (pin) => set({ overridePin: pin }),
  setPlatformFee: (fee) => set({ platformFee: fee }),

  reset: () => {
    const fresh = buildDemoData();
    set({ events: fresh.events, scans: fresh.scans });
  },
}));
