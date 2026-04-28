import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * prisma.config.ts — Prisma 7 database connection
 *
 * DATABASE_URL and DIRECT_URL are stored in .env.local (never committed to git).
 *
 * Prisma CLI does not read .env.local by default, so always use the
 * npm scripts in package.json which pass --env-file .env.local:
 *
 *   npm run db:generate   ← npx prisma generate --env-file .env.local
 *   npm run db:push       ← npx prisma db push   --env-file .env.local
 *   npm run db:studio     ← npx prisma studio     --env-file .env.local
 *
 * Never run `npx prisma ...` directly — always use `npm run db:...`
 */

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // DIRECT_URL bypasses PgBouncer — required for schema migrations (db push)
    // Falls back to DATABASE_URL if DIRECT_URL is not set
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
