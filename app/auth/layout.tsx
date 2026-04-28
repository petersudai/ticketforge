import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — TicketForge Pro",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#06060e] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(108,92,231,0.12) 0%, transparent 65%)",
        }}
      />
      <div className="relative z-10 w-full max-w-[420px]">{children}</div>
    </div>
  );
}
