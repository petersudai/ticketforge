import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function genTicketId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "TF-";
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  id += "-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatCurrency(amount: number, currency = "KES"): string {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

/**
 * Compact number formatter used in stat cards and dashboard tiles.
 *
 *   <1,000             → "847"
 *   1,000–9,999        → "1.2K"
 *   10,000–999,999     → "12K", "234K", "999K"   (no decimal)
 *   1,000,000+         → "1.4M", "12M", "234M"
 *   1,000,000,000+     → "1.2B"
 *
 * Pass `currency` to prefix the output, e.g. formatCompact(1_435_000, "KES")
 * returns "KES 1.4M". Without currency the prefix is omitted entirely.
 *
 * Standard SaaS convention — matches what Stripe, Linear, Notion, Vercel
 * use in their dashboards. Avoids unprofessional outputs like "1435K" that
 * happen when only the K bucket is implemented.
 */
export function formatCompact(n: number, currency?: string): string {
  const prefix = currency ? `${currency} ` : "";
  // Handle negatives consistently — we want "-1.2M" not "1.-2M".
  const sign = n < 0 ? "-" : "";
  const abs  = Math.abs(n);

  let body: string;
  if      (abs >= 1_000_000_000) body = `${(abs / 1_000_000_000).toFixed(1)}B`;
  else if (abs >= 1_000_000)     body = `${(abs / 1_000_000    ).toFixed(1)}M`;
  else if (abs >= 10_000)        body = `${Math.round(abs / 1_000)}K`;
  else if (abs >= 1_000)         body = `${(abs / 1_000).toFixed(1)}K`;
  else                           body = Math.round(abs).toLocaleString();

  return `${prefix}${sign}${body}`;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
