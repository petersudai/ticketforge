import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "TicketForge Pro — Event Ticketing Platform",
  description: "Professional event ticketing with M-Pesa payments, QR scanning, and analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased bg-[#0a0a0f] text-[#f0f0f8]"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        {/* AuthProvider: single getUser() call shared across all components */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
