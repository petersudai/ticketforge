import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo — TicketForge Pro",
  description: "See TicketForge in action — real events, real tickets, real M-Pesa flow. No signup needed.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0a0a0f]">{children}</div>;
}
