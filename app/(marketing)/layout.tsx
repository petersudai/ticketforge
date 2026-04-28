import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TicketForge Pro — Event Ticketing for Africa",
  description: "The modern ticketing platform built for African events. M-Pesa payments, instant QR tickets, real-time analytics. Start free.",
  openGraph: {
    title: "TicketForge Pro — Event Ticketing for Africa",
    description: "The modern ticketing platform built for African events.",
    type: "website",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#06060e] text-white">{children}</div>;
}
