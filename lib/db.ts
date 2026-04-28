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
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "\n\n" +
      "════════════════════════════════════════════════════════════\n" +
      "  TicketForge: DATABASE_URL is not set\n" +
      "════════════════════════════════════════════════════════════\n" +
      "  Fix:\n" +
      "    1. Add DATABASE_URL to .env.local\n" +
      "       (Supabase → Project Settings → Database → URI)\n" +
      "    2. npm run db:generate\n" +
      "    3. npm run db:push\n" +
      "    4. npm run dev\n" +
      "════════════════════════════════════════════════════════════\n\n"
    );
  }

  const adapter = new PrismaPg({ connectionString: url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"],
  });
}

// Singleton: reuse the same instance across hot-reloads in dev
export const prisma: PrismaClient =
  globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// Preferred alias for new code
export const db = prisma;
