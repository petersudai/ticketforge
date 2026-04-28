import type { Event, Attendee, Scan, Tier } from "./useStore";

// ── Helpers ───────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2, 10);
const tid  = () => {
  const C = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "TF-";
  for (let i = 0; i < 4; i++) s += C[Math.floor(Math.random() * C.length)];
  s += "-";
  for (let i = 0; i < 6; i++) s += C[Math.floor(Math.random() * C.length)];
  return s;
};
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysAgo = (n: number) => daysFromNow(-n);

// ── Kenyan attendee names ─────────────────────────────────────────────
const NAMES = [
  "Amara Okonkwo","Brian Kamau","Cynthia Wanjiru","David Mutua","Esther Njeri",
  "Felix Ochieng","Grace Muthoni","Hassan Abdalla","Irene Akinyi","James Kariuki",
  "Kamau Waweru","Linda Atieno","Michael Mwangi","Nancy Chebet","Oliver Onyango",
  "Patricia Ndung'u","Quinn Wafula","Rose Wairimu","Samuel Oduya","Tabitha Maina",
  "Usman Abdi","Vivian Cherono","Walter Ouma","Xenia Njoroge","Yasmin Hassan",
  "Zack Kipchoge","Aisha Mohammed","Bernard Gitau","Christine Auma","Dennis Mburu",
  "Eleanor Koech","Frank Nzioka","Gloria Adhiambo","Henry Rotich","Isabella Wawira",
];

const PHONES = () => `07${Math.floor(10000000 + Math.random() * 89999999)}`;
const EMAILS = (name: string) =>
  `${name.split(" ")[0].toLowerCase()}.${name.split(" ").slice(-1)[0].toLowerCase()}@gmail.com`;

function makeAttendees(
  eventId: string,
  tiers: Tier[],
  count: number,
  checkinRate: number,
  emailRate: number
): Attendee[] {
  return Array.from({ length: count }, (_, i) => {
    const name    = NAMES[i % NAMES.length];
    const tier    = tiers[Math.floor(Math.random() * tiers.length)];
    const checked = Math.random() < checkinRate;
    return {
      id:          uid(),
      name,
      email:       EMAILS(name),
      phone:       PHONES(),
      seat:        `${String.fromCharCode(65 + Math.floor(i / 10))}-${String(i % 10 + 1).padStart(2, "0")}`,
      ticketId:    tid(),
      payStatus:   Math.random() < 0.92 ? "paid" : Math.random() < 0.5 ? "free" : "pending",
      pricePaid:   tier.price,
      checkedIn:   checked,
      checkedInAt: checked ? new Date(Date.now() - Math.random() * 3_600_000).toISOString() : undefined,
      emailSent:   Math.random() < emailRate,
      tier:        tier.name,
      tierId:      tier.id,
      source:      Math.random() < 0.7 ? "public" : "manual",
      eventId,
      createdAt:   new Date(Date.now() - Math.random() * 86_400_000 * 14).toISOString(),
    } satisfies Attendee;
  });
}

function makeScans(event: Event, count: number): Scan[] {
  const validAttendees = event.attendees.filter(a => a.checkedIn);
  return validAttendees.slice(0, count).map(a => ({
    id:          uid(),
    ticketId:    a.ticketId,
    attendeeId:  a.id,
    attendeeName: a.name,
    attendeeTier: a.tier,
    eventId:     event.id,
    eventName:   event.name,
    result:      "valid" as const,
    scannedAt:   a.checkedInAt || new Date().toISOString(),
  }));
}

// ── Build the full demo dataset ───────────────────────────────────────
export function buildDemoData(): { events: Event[]; scans: Scan[] } {

  // Event 1: Upcoming jazz night — active, selling well
  const jazzId = uid();
  const jazzTiers: Tier[] = [
    { id: uid(), name: "Early Bird",  price: 1500, quantity: 50,  capacity: 1 },
    { id: uid(), name: "General",     price: 2500, quantity: 200, capacity: 1 },
    { id: uid(), name: "VIP",         price: 5000, quantity: 40,  capacity: 1 },
    { id: uid(), name: "VVIP Table",  price: 12000, quantity: 10, capacity: 6 },
  ];
  const jazzAttendees = makeAttendees(jazzId, jazzTiers, 187, 0, 0.65);
  const jazzEvent: Event = {
    id: jazzId,
    name: "Nairobi Jazz Night 2025",
    slug: "nairobi-jazz-night-2025",
    date: daysFromNow(12),
    time: "7:00 PM",
    venue: "KICC Rooftop, Nairobi",
    organizer: "Kenya Jazz Collective",
    category: "Music & Entertainment",
    description: "An unforgettable evening of live jazz under the Nairobi skyline. Featuring top local and international artists.",
    capacity: 300,
    currency: "KES",
    accent: "#6C5CE7",
    tiers: jazzTiers,
    attendees: jazzAttendees,
    createdAt: daysAgo(20),
  };

  // Event 2: Corporate summit — already ran, high check-in
  const summitId = uid();
  const summitTiers: Tier[] = [
    { id: uid(), name: "Standard",  price: 3500, quantity: 200, capacity: 1 },
    { id: uid(), name: "Executive", price: 8500, quantity: 50,  capacity: 1 },
    { id: uid(), name: "Sponsor",   price: 0,    quantity: 20,  capacity: 1 },
  ];
  const summitAttendees = makeAttendees(summitId, summitTiers, 234, 0.91, 1.0);
  const summitEvent: Event = {
    id: summitId,
    name: "Startup Summit Kenya 2025",
    slug: "startup-summit-kenya-2025",
    date: daysAgo(3),
    time: "9:00 AM",
    venue: "Tribe Hotel, Gigiri, Nairobi",
    organizer: "KE Founders Hub",
    category: "Corporate",
    description: "Kenya's largest startup conference. 3 stages, 60+ speakers, pitch competitions, and networking.",
    capacity: 280,
    currency: "KES",
    accent: "#0984e3",
    tiers: summitTiers,
    attendees: summitAttendees,
    createdAt: daysAgo(45),
  };

  // Event 3: Upcoming music festival — recently launched, moderate sales
  const festId = uid();
  const festTiers: Tier[] = [
    { id: uid(), name: "Day Pass",   price: 800,  quantity: 500, capacity: 1 },
    { id: uid(), name: "Weekend",    price: 1500, quantity: 300, capacity: 1 },
    { id: uid(), name: "VIP Weekend",price: 4000, quantity: 80,  capacity: 1 },
  ];
  const festAttendees = makeAttendees(festId, festTiers, 89, 0, 0.4);
  const festEvent: Event = {
    id: festId,
    name: "AfroBeats Nairobi Festival",
    slug: "afrobeats-nairobi-2025",
    date: daysFromNow(28),
    time: "4:00 PM",
    venue: "Uhuru Gardens, Nairobi",
    organizer: "Africa Sounds Events",
    category: "Music & Entertainment",
    description: "Three days of Africa's best Afrobeats, Gengetone, and Bongo Flava. Food village, art exhibitions, and after-parties.",
    capacity: 880,
    currency: "KES",
    accent: "#e17055",
    tiers: festTiers,
    attendees: festAttendees,
    createdAt: daysAgo(8),
  };

  // Event 4: Comedy night — small, free event
  const comedyId = uid();
  const comedyTiers: Tier[] = [
    { id: uid(), name: "General", price: 500, quantity: 150, capacity: 1 },
  ];
  const comedyAttendees = makeAttendees(comedyId, comedyTiers, 67, 0.82, 0.88);
  const comedyEvent: Event = {
    id: comedyId,
    name: "Nairobi Comedy Night Vol. 12",
    slug: "nairobi-comedy-night-vol12",
    date: daysAgo(1),
    time: "8:00 PM",
    venue: "K1 Flea Market, Kileleshwa",
    organizer: "Laugh Factory KE",
    category: "Arts & Culture",
    description: "Monthly stand-up comedy showcase featuring Kenya's funniest emerging and established comedians.",
    capacity: 120,
    currency: "KES",
    accent: "#00b894",
    tiers: comedyTiers,
    attendees: comedyAttendees,
    createdAt: daysAgo(18),
  };

  const events = [jazzEvent, summitEvent, festEvent, comedyEvent];

  // Build scans from checked-in attendees across past events
  const scans: Scan[] = [
    ...makeScans(summitEvent, summitAttendees.filter(a => a.checkedIn).length),
    ...makeScans(comedyEvent, comedyAttendees.filter(a => a.checkedIn).length),
    // A few invalid scans for realism
    {
      id: uid(), ticketId: "TF-FAKE-BADQR1",
      eventId: summitId, eventName: "Startup Summit Kenya 2025",
      result: "invalid" as const, scannedAt: daysAgo(3),
    },
    {
      id: uid(), ticketId: summitAttendees[0]?.ticketId || "TF-DUP",
      attendeeId: summitAttendees[0]?.id, attendeeName: summitAttendees[0]?.name,
      attendeeTier: summitAttendees[0]?.tier,
      eventId: summitId, eventName: "Startup Summit Kenya 2025",
      result: "duplicate" as const, scannedAt: daysAgo(3),
    },
  ];

  return { events, scans };
}

// ── Summary stats derived from demo data ──────────────────────────────
export function getDemoStats(events: Event[]) {
  const totalTickets   = events.reduce((s, e) => s + e.attendees.length, 0);
  const totalRevenue   = events.reduce((s, e) =>
    s + e.attendees.filter(a => a.payStatus === "paid").reduce((r, a) => r + a.pricePaid, 0), 0
  );
  const totalCheckedIn = events.reduce((s, e) => s + e.attendees.filter(a => a.checkedIn).length, 0);
  const checkinRate    = totalTickets ? Math.round((totalCheckedIn / totalTickets) * 100) : 0;
  return { totalTickets, totalRevenue, totalCheckedIn, checkinRate };
}
