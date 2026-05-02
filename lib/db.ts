/**
 * lib/db.ts — Prisma 7 client singleton using driver adapter
 *
 * Prisma 7 with prisma.config.ts uses the driver adapter pattern at runtime.
 * The `datasources` constructor option was removed in Prisma 7.
 * The correct pattern is:
 *   1. Create a pg Pool with the DATABASE_URL
 *   2. Wrap it with PrismaPostgres adapter from @prisma/adapter-pg
 *   3. Pass the adapter to PrismaClient constructor
 *
 * This is why @prisma/adapter-pg and pg are in package.json.
 *
 * Setup (run once after npm install or schema changes):
 *   npm run db:generate   ← generates the TypeScript client
 *   npm run db:push       ← pushes schema to Supabase
 *   npm run dev
 *
 * RESILIENCE:
 *   createClient() returns null (does NOT throw) when DATABASE_URL is missing
 *   or PrismaClient fails to initialise. A module-level throw would crash the
 *   serverless function before the route handler even runs, which Next.js 16
 *   can surface as a 404 instead of a meaningful error.
 *
 * EXPORTS:
 *   prisma — PrismaClient | null  (nullable; use for public/unauthenticated
 *                                   routes that should gracefully degrade)
 *   db     — PrismaClient         (non-null assertion for TypeScript; use in
 *                                   authenticated routes that have try/catch)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | null | undefined;
}

function createClient(): PrismaClient | null {
  const url = process.env.DATABASE_URL;

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "\n[db] FATAL: DATABASE_URL is not set in production.\n" +
        "    Add it to your Vercel environment variables and redeploy.\n"
      );
    } else {
      console.warn(
        "\n[db] DATABASE_URL is not set — DB features are unavailable.\n" +
        "    Add it to .env.local and restart the dev server.\n" +
        "    See .env.example for the required format.\n"
      );
    }
    return null;
  }

  try {
    const adapter = new PrismaPg({ connectionString: url });

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    });
  } catch (err) {
    console.error("[db] Failed to initialise Prisma client:", err);
    return null;
  }
}

// Singleton: reuse across hot-reloads in dev.
// Uses explicit `undefined` sentinel so we can distinguish "never initialised"
// (undefined) from "initialised but DB is unavailable" (null).
const _client: PrismaClient | null =
  globalThis.__prisma !== undefined
    ? (globalThis.__prisma ?? null)
    : createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = _client;
}

/**
 * Nullable export — use in:
 *   • Server Components that should degrade gracefully (return [] / empty state)
 *   • Public (unauthenticated) API routes
 *
 * Always check `if (!prisma)` before use.
 */
export const prisma: PrismaClient | null = _client;

/**
 * Non-null export — use in:
 *   • Authenticated API routes that already guard DB calls with try/catch
 *
 * TypeScript treats this as always-defined. If DATABASE_URL is missing at
 * runtime the first DB call throws a TypeError that the route's catch block
 * turns into a 500 — which is the correct, visible failure mode for an
 * infra misconfiguration on a protected route.
 */
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const db: PrismaClient = _client!;
