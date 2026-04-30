/**
 * lib/validators.ts — Zod validation schemas
 *
 * Used by API route handlers to validate incoming request bodies.
 * Import the schema you need, call .safeParse(body), check success.
 *
 * Usage in a route:
 *   const result = CreateEventSchema.safeParse(await req.json());
 *   if (!result.success) {
 *     return NextResponse.json(
 *       { error: "Invalid input", details: result.error.flatten() },
 *       { status: 400 }
 *     );
 *   }
 *   const data = result.data; // fully typed and validated
 */

import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────

export const SignUpSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  email:    z.string().email("Invalid email address").toLowerCase(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const SignInSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const OnboardingSchema = z.object({
  orgName:        z.string().min(2, "Organisation name is too short").max(100).trim(),
  orgSlug:        z.string().max(60).regex(/^[a-z0-9-]*$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  mpesaSc:        z.string().max(20).optional().nullable(),
  supabaseUserId: z.string().uuid("Invalid user ID"),
});

// ── Events ────────────────────────────────────────────────────────────

export const TierSchema = z.object({
  id:           z.string().optional(),
  name:         z.string().min(1, "Tier name is required").max(50).trim(),
  price:        z.number().min(0, "Price cannot be negative").max(1_000_000),
  quantity:     z.number().int().min(1, "Quantity must be at least 1").max(100_000),
  capacity:     z.number().int().min(1).max(100).default(1),
  hidden:       z.boolean().default(false),
  sortOrder:    z.number().int().default(0),
  saleStartsAt: z.string().datetime().nullable().optional(),
  saleEndsAt:   z.string().datetime().nullable().optional(),
});

export const CreateEventSchema = z.object({
  name:        z.string().min(3, "Event name is too short").max(200).trim(),
  slug:        z.string().max(80).optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  time:        z.string().min(1, "Event time is required").max(20),
  endTime:     z.string().max(20).optional().nullable(),
  endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  venue:       z.string().min(1, "Venue is required").max(200).trim(),
  organizer:   z.string().min(1, "Organizer / brand name is required").max(100).trim(),
  category:    z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  capacity:    z.number().int().min(1).max(1_000_000).optional().nullable(),
  currency:    z.enum(["KES", "USD", "UGX", "TZS"]).default("KES"),
  accent:      z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6C5CE7"),
  mpesaSc:     z.string().max(20).optional().nullable(),
  orgId:       z.string().min(1, "Organisation ID is required"),
  tiers:       z.array(TierSchema).min(1, "At least one ticket tier is required").max(20),
});

export const UpdateEventSchema = CreateEventSchema.partial().omit({ orgId: true, tiers: true });

// ── Attendees ─────────────────────────────────────────────────────────

export const CreateAttendeeSchema = z.object({
  name:      z.string().min(2, "Name is too short").max(100).trim(),
  email:     z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone:     z.string().max(20).optional().nullable(),
  seat:      z.string().max(20).optional().nullable(),
  tier:      z.string().max(50).optional().nullable(),
  tierId:    z.string().optional().nullable(),
  ticketId:  z.string().min(1),
  payStatus: z.enum(["paid", "free", "pending"]).default("pending"),
  pricePaid: z.number().min(0).default(0),
  source:    z.enum(["manual", "import", "public"]).default("manual"),
  eventId:   z.string().min(1, "Event ID is required"),
});

export const UpdateAttendeeSchema = z.object({
  name:          z.string().min(2).max(100).trim().optional(),
  email:         z.string().email().optional().nullable(),
  phone:         z.string().max(20).optional().nullable(),
  seat:          z.string().max(20).optional().nullable(),
  payStatus:     z.enum(["paid", "free", "pending"]).optional(),
  pricePaid:     z.number().min(0).optional(),
  checkedIn:     z.boolean().optional(),
  checkedInAt:   z.string().datetime().optional().nullable(),
  emailSent:     z.boolean().optional(),
  downloadCount: z.number().int().min(0).optional(),
}).strict();

// ── Scanner ───────────────────────────────────────────────────────────

export const ScanSchema = z.object({
  ticketId: z.string()
    .min(1, "Ticket ID is required")
    .regex(/^TF-[A-Z0-9]{4}-[A-Z0-9]{6}$/, "Invalid ticket ID format"),
  eventId:  z.string().min(1, "Event ID is required"),
  override: z.boolean().default(false),
});

// ── M-Pesa ────────────────────────────────────────────────────────────

export const MpesaInitSchema = z.object({
  phone:         z.string()
    .regex(/^(\+?254|0)[17]\d{8}$/, "Invalid Kenyan phone number"),
  // Amount is intentionally NOT accepted from the client.
  // The server computes expectedAmount = tier.price × quantity to prevent tampering.
  quantity:      z.number().int().min(1, "Quantity must be at least 1").max(20, "Maximum 20 tickets per purchase").default(1),
  tierId:        z.string().min(1),
  eventId:       z.string().min(1),
  eventName:     z.string().min(1).max(200),
  attendeeName:  z.string().min(1).max(100),
  attendeeEmail: z.string().email().optional().nullable(),
});

// ── Helper: parse and return 400 on failure ───────────────────────────

import { NextResponse } from "next/server";

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
