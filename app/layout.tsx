import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "TicketForge Pro — Event Ticketing Platform",
  description: "Professional event ticketing with M-Pesa payments, QR scanning, and analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Fonts are self-hosted (see @font-face in globals.css). Preload the
            two critical faces (body + headings, latin) so the swap happens
            fast and there's no flash. crossOrigin is required for font preloads
            even same-origin (fonts fetch in CORS mode). */}
        <link rel="preload" href="/fonts/dmsans-normal-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/syne-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body
        className="antialiased bg-[#0a0a0f] text-[#f0f0f8]"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        {/* AuthProvider: single getUser() call shared across all components */}
        <AuthProvider>
          {children}
          {/* App-wide toast viewport. Mounted once here so toast.error()
              etc. dispatched from any component reach this renderer. */}
          <ToastViewport />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
