/**
 * lib/constants/categories.ts
 *
 * Single source of truth for event categories across the whole platform:
 *   - New Event form
 *   - Edit Event form
 *   - Marketplace filter chips
 *   - Marketplace category tag colours
 *   - Marketplace "Get Tickets" button colour
 *
 * Adding a category here automatically propagates to all of the above.
 */

export const CATEGORIES = [
  "Music & Entertainment",
  "Corporate",
  "Community & Social",
  "Sports & Fitness",
  "Arts & Culture",
  "Education",
  "Others",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** bg = tag background, text = tag text / button accent colour */
export const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  "Music & Entertainment": { bg: "rgba(162,156,244,0.12)", text: "#a29cf4" },
  "Corporate":             { bg: "rgba(116,185,255,0.12)", text: "#74b9ff" },
  "Community & Social":    { bg: "rgba(85,239,196,0.12)",  text: "#55efc4" },
  "Sports & Fitness":      { bg: "rgba(253,203,110,0.12)", text: "#fdcb6e" },
  "Arts & Culture":        { bg: "rgba(240,153,123,0.12)", text: "#f0997b" },
  "Education":             { bg: "rgba(116,185,255,0.12)", text: "#74b9ff" },
  "Others":                { bg: "rgba(178,190,195,0.12)", text: "#b2bec3" },
};

/** Tag style for a category — bg + text. Falls back to a neutral tint for unknown values. */
export function catStyle(cat?: string | null): { bg: string; text: string } {
  return CAT_COLORS[cat ?? ""] ?? { bg: "rgba(255,255,255,0.07)", text: "rgba(255,255,255,0.45)" };
}

/**
 * Solid accent colour for "Get Tickets" button / interactive elements.
 * Always returns a real opaque colour — falls back to brand purple.
 */
export function catButtonColor(cat?: string | null): string {
  return CAT_COLORS[cat ?? ""]?.text ?? "#6C5CE7";
}

/**
 * Normalize a free-text category value to the nearest canonical option.
 * Used when backfilling events that were created before the dropdown was enforced.
 * Returns the input unchanged if it already matches; returns "Others" if no match.
 */
export function normalizeCategory(raw?: string | null): string {
  if (!raw) return "Others";
  const exact = CATEGORIES.find(c => c.toLowerCase() === raw.trim().toLowerCase());
  if (exact) return exact;
  // Fuzzy: "other" → "Others", "music" → "Music & Entertainment", etc.
  const lower = raw.trim().toLowerCase();
  if (lower === "other") return "Others";
  const partial = CATEGORIES.find(c => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase().split(" ")[0]));
  return partial ?? "Others";
}
