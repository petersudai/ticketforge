/**
 * lib/fees.ts — TicketForge fee calculator (single source of truth)
 *
 * Every place in the app that displays a fee, calculates a payout, shows a
 * revenue breakdown, or charges a buyer MUST go through this module. Hard-
 * coding a percentage or fee anywhere else creates drift the moment we
 * change pricing.
 *
 * Public pricing (V1, locked 2026-05):
 *   • 5% commission per paid ticket
 *   • Floor: KES 10 per ticket (covers M-Pesa STK cost on cheap tickets)
 *   • Cap:   KES 750 per ticket (premium-organiser-friendly)
 *   • Payout: KES 100 flat per M-Pesa withdrawal
 *   • Launch promo: first event published per organiser is commission-free
 *   • Free events: zero fees on both sides
 *
 * Two fee modes (per Event, set at creation):
 *   • "absorbed"    — buyer pays ticket price; organiser absorbs commission
 *                     + M-Pesa fee out of their payout. (DEFAULT for V1.)
 *   • "passthrough" — buyer pays ticket price + fees as a separate line at
 *                     checkout; organiser receives the full nominal price.
 *                     Schema is ready; UI toggle is deferred to V1.5.
 *
 * VAT:
 *   Headline 5% is VAT-INCLUSIVE. Below KRA's KES 5M annual turnover
 *   threshold we don't owe VAT; above, internal accounting splits the 5%
 *   into 4.31% revenue + 0.69% VAT-payable. Flip VAT_REGISTERED below
 *   when we register; no consumer-facing change required.
 *
 * Money math:
 *   We work in whole units of the event's currency (KES, USD, etc.) since
 *   M-Pesa minimum is 1 KES and our prices have no fractional component.
 *   Commissions are rounded half-up to whole units. M-Pesa fee comes from
 *   a lookup table (always integer). Float drift is not a concern at this
 *   scale, but Math.round is applied defensively at every boundary.
 *
 * Currency note:
 *   M-Pesa is the only payment processor right now, and M-Pesa charges KES.
 *   Events can be denominated in KES / USD / UGX / TZS in the UI, but the
 *   actual STK Push always happens in KES. For V1 we treat the price as
 *   KES regardless of the event's `currency` field. When we add non-M-Pesa
 *   processors, this assumption breaks and the calculator must take the
 *   processor as a parameter.
 */

// ── Public pricing constants ─────────────────────────────────────────
// Change these in ONE place; the entire app updates. Keep `as const` so
// TypeScript treats them as literal types (better autocomplete + safety).

export const PRICING = {
  COMMISSION_RATE:  0.05,   // 5%
  COMMISSION_FLOOR: 10,     // KES per ticket (min charge)
  COMMISSION_CAP:   750,    // KES per ticket (max charge)
  PAYOUT_FEE:       100,    // KES per withdrawal to organiser's M-Pesa
  VAT_RATE:         0.16,   // 16% Kenyan standard VAT
  VAT_REGISTERED:   false,  // flip to true once we cross KES 5M annual turnover
} as const;

// ── M-Pesa STK Push fee bands ────────────────────────────────────────
// Source: Safaricom Lipa Na M-Pesa C2B tariffs (consumer-paid). Bands are
// ascending — use the FIRST band whose `maxAmount` covers the ticket price.
// Update from Safaricom's published tariff sheet when rates change.
//
// Last verified: 2026-05.

const MPESA_FEE_BANDS: readonly { maxAmount: number; fee: number }[] = [
  { maxAmount:     100, fee:   0 },
  { maxAmount:     500, fee:   7 },
  { maxAmount:   1_000, fee:  13 },
  { maxAmount:   1_500, fee:  23 },
  { maxAmount:   2_500, fee:  33 },
  { maxAmount:   3_500, fee:  53 },
  { maxAmount:   5_000, fee:  57 },
  { maxAmount:   7_500, fee:  78 },
  { maxAmount:  10_000, fee:  90 },
  { maxAmount:  15_000, fee: 100 },
  { maxAmount:  20_000, fee: 105 },
  // Above 20K, M-Pesa caps the C2B fee at 108 KES regardless of amount.
  { maxAmount: 150_000, fee: 108 },
];

/**
 * Look up the M-Pesa STK Push fee for a given ticket price.
 * Returns 0 for negative/zero amounts. Returns the top-band fee for
 * amounts above the highest band (defensive for future M-Pesa limit changes).
 */
function lookupMpesaFee(amount: number): number {
  if (amount <= 0) return 0;
  for (const band of MPESA_FEE_BANDS) {
    if (amount <= band.maxAmount) return band.fee;
  }
  return MPESA_FEE_BANDS[MPESA_FEE_BANDS.length - 1].fee;
}

// ── Types ─────────────────────────────────────────────────────────────

export type FeeMode = "absorbed" | "passthrough";

export interface FeeInputs {
  /** Ticket face price in the event's currency (whole units, e.g. KES 2000). */
  ticketPrice:       number;
  /** Currency code — informational only in V1 (see currency note in header). */
  currency:          string;
  /** Who pays the fees visibly. Defaults to "absorbed". */
  mode?:             FeeMode;
  /** True when this event qualifies for the launch promo (first-event-free). */
  commissionWaived?: boolean;
}

export interface FeeBreakdown {
  // Inputs (echoed back so consumers don't need to thread them through)
  ticketPrice:             number;
  currency:                string;
  mode:                    FeeMode;

  // Commission — the platform's cut
  commission:              number;   // KES, after floor/cap/waiver
  effectiveRate:           number;   // commission / ticketPrice (0..1) — for display
  commissionWaived:        boolean;  // true → launch promo applied
  commissionFloorApplied:  boolean;  // true → raised to floor
  commissionCapApplied:    boolean;  // true → reduced to cap

  // Payment processing
  mpesaFee:                number;   // pass-through Safaricom STK fee

  // Bottom-line money flows
  /** What the buyer pays at checkout. */
  buyerPays:               number;
  /** What credits the organiser's balance for one ticket sold (before payout fee). */
  organiserReceives:       number;
}

// ── Core calculator ──────────────────────────────────────────────────

/**
 * Calculate the complete fee breakdown for a single ticket sale.
 *
 * Pure function: same inputs → same outputs, no side effects. Safe to call
 * from server (event creation, payout calculation) and client (event form
 * preview, dashboard analytics).
 *
 * Mode semantics:
 *   absorbed:    buyerPays = ticketPrice
 *                organiserReceives = ticketPrice - commission - mpesaFee
 *   passthrough: buyerPays = ticketPrice + commission + mpesaFee
 *                organiserReceives = ticketPrice
 */
export function calculateFees(input: FeeInputs): FeeBreakdown {
  const {
    ticketPrice,
    currency,
    mode             = "absorbed",
    commissionWaived = false,
  } = input;

  // Free events short-circuit — no money moves, no fees.
  if (ticketPrice <= 0) {
    return {
      ticketPrice:            0,
      currency,
      mode,
      commission:             0,
      effectiveRate:          0,
      commissionWaived:       false,
      commissionFloorApplied: false,
      commissionCapApplied:   false,
      mpesaFee:               0,
      buyerPays:              0,
      organiserReceives:      0,
    };
  }

  // Defensive: round input to whole units to prevent float drift downstream.
  const price = Math.round(ticketPrice);

  // ── Commission with floor / cap / waiver ────────────────────────────
  let commission             = 0;
  let commissionFloorApplied = false;
  let commissionCapApplied   = false;

  if (!commissionWaived) {
    const raw = price * PRICING.COMMISSION_RATE;

    if (raw < PRICING.COMMISSION_FLOOR) {
      commission             = PRICING.COMMISSION_FLOOR;
      commissionFloorApplied = true;
    } else if (raw > PRICING.COMMISSION_CAP) {
      commission             = PRICING.COMMISSION_CAP;
      commissionCapApplied   = true;
    } else {
      // Round half-up to nearest whole unit. Math.round in JS rounds half
      // away from zero, which equals half-up for positive numbers.
      commission = Math.round(raw);
    }
  }

  // ── M-Pesa STK Push fee (lookup) ────────────────────────────────────
  const mpesaFee = lookupMpesaFee(price);

  // ── Mode-dependent split ────────────────────────────────────────────
  let buyerPays:         number;
  let organiserReceives: number;

  if (mode === "passthrough") {
    buyerPays         = price + commission + mpesaFee;
    organiserReceives = price;
  } else {
    // absorbed (default)
    buyerPays         = price;
    organiserReceives = price - commission - mpesaFee;
  }

  return {
    ticketPrice:            price,
    currency,
    mode,
    commission,
    effectiveRate:          commission / price,
    commissionWaived,
    commissionFloorApplied,
    commissionCapApplied,
    mpesaFee,
    buyerPays,
    organiserReceives,
  };
}

// ── Aggregated calculators ───────────────────────────────────────────
// Convenience helpers for the dashboard and revenue page. Sum up many
// individual ticket calculations into a single rollup.

export interface AggregateInput {
  ticketPrice:       number;
  quantity:          number;
  mode?:             FeeMode;
  commissionWaived?: boolean;
  currency:          string;
}

export interface AggregateBreakdown {
  grossRevenue:      number;   // sum of buyerPays × quantity
  totalCommission:   number;   // sum of commission × quantity
  totalMpesaFees:    number;   // sum of mpesaFee × quantity
  netToOrganiser:    number;   // sum of organiserReceives × quantity
  totalTickets:      number;   // sum of quantity
}

/**
 * Aggregate fees across many sales (e.g. for a dashboard "this month"
 * card or an event's total revenue). Handles mixed-price tiers and
 * mixed waiver states correctly.
 */
export function aggregateFees(rows: AggregateInput[]): AggregateBreakdown {
  let grossRevenue    = 0;
  let totalCommission = 0;
  let totalMpesaFees  = 0;
  let netToOrganiser  = 0;
  let totalTickets    = 0;

  for (const row of rows) {
    const breakdown = calculateFees({
      ticketPrice:      row.ticketPrice,
      currency:         row.currency,
      mode:             row.mode,
      commissionWaived: row.commissionWaived,
    });
    grossRevenue    += breakdown.buyerPays         * row.quantity;
    totalCommission += breakdown.commission        * row.quantity;
    totalMpesaFees  += breakdown.mpesaFee          * row.quantity;
    netToOrganiser  += breakdown.organiserReceives * row.quantity;
    totalTickets    += row.quantity;
  }

  return { grossRevenue, totalCommission, totalMpesaFees, netToOrganiser, totalTickets };
}

// ── Payout calculator ────────────────────────────────────────────────

/**
 * Net amount the organiser receives after a withdrawal, given a requested
 * gross balance to withdraw. Always at least 0 (can't pay out a negative).
 */
export function calculatePayout(grossBalance: number): {
  grossBalance: number;
  payoutFee:    number;
  netReceived:  number;
} {
  const fee = PRICING.PAYOUT_FEE;
  const net = Math.max(0, Math.round(grossBalance) - fee);
  return {
    grossBalance: Math.round(grossBalance),
    payoutFee:    fee,
    netReceived:  net,
  };
}

// ── Display helpers ──────────────────────────────────────────────────

/**
 * Format the effective commission rate as a percentage string for display.
 * Returns "0%" for waived, "5%" for full rate, "1.5%" for cap-affected, etc.
 *
 * Rounds to 1 decimal place. We don't show more precision because the buyer
 * sees a whole-number commission amount anyway — fractional percentages
 * just look noisy.
 */
export function formatEffectiveRate(breakdown: FeeBreakdown): string {
  if (breakdown.commissionWaived)             return "0% (waived)";
  if (breakdown.effectiveRate === 0)          return "0%";
  const pct = breakdown.effectiveRate * 100;
  // For the unmodified 5% rate we drop the decimal — "5%" reads better
  // than "5.0%". For floor/cap-affected rates we keep one decimal.
  if (Math.abs(pct - PRICING.COMMISSION_RATE * 100) < 0.01) {
    return `${pct.toFixed(0)}%`;
  }
  return `${pct.toFixed(1)}%`;
}
