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

/**
 * Time format helpers.
 *
 * Events store their time as a human-readable display string ("7:00 PM"),
 * which is what every display surface (event page, order page, marketplace,
 * tickets, emails) renders directly. To let organisers pick a time with a
 * native <input type="time"> (which speaks 24-hour "HH:MM") WITHOUT changing
 * the stored format, we convert at the form boundary:
 *
 *   • to24Hour("7:00 PM") -> "19:00"   (display string -> input value)
 *   • to12Hour("19:00")   -> "7:00 PM" (input value -> stored display string)
 *
 * Both are tolerant: unparseable input returns "" rather than throwing, so a
 * legacy or malformed value never crashes a form or wipes data silently.
 */

/** "19:00" -> "7:00 PM". Returns "" for invalid input. */
export function to12Hour(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const min = m[2];
  if (h < 0 || h > 23 || parseInt(min, 10) > 59) return "";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${period}`;
}

/**
 * "7:00 PM" -> "19:00" for a native <input type="time">.
 * Accepts both 12-hour ("7:00 PM") and already-24-hour ("19:00") inputs.
 * Returns "" if it can't confidently parse (caller keeps the original value).
 */
export function to24Hour(display: string): string {
  const s = (display ?? "").trim();
  if (!s) return "";

  // 12-hour with AM/PM (most specific) — try first.
  const twelve = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(s);
  if (twelve) {
    let h = parseInt(twelve[1], 10);
    const min = twelve[2];
    const period = twelve[3].toUpperCase();
    if (h < 1 || h > 12 || parseInt(min, 10) > 59) return "";
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }

  // Already 24-hour "HH:MM".
  const direct = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (direct) {
    const h = parseInt(direct[1], 10);
    const min = parseInt(direct[2], 10);
    if (h >= 0 && h <= 23 && min <= 59) {
      return `${String(h).padStart(2, "0")}:${direct[2]}`;
    }
  }

  return "";
}
