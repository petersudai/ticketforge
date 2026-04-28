#!/usr/bin/env tsx
/**
 * scripts/seed-admin.ts
 *
 * Assigns the "super_admin" role to an existing TicketForge user.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts your-email@example.com
 *
 * What it does:
 *   1. Looks up the user in Supabase Auth by email
 *   2. Updates their user_metadata.role = "super_admin" (JWT is refreshed on next login)
 *   3. Upserts their Profile row in Postgres with role = "super_admin"
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - DATABASE_URL in .env.local (for Prisma)
 *
 * The user must already have an account (signed up first).
 * Run from the project root with dotenv-cli:
 *   dotenv -e .env.local -- npx tsx scripts/seed-admin.ts your@email.com
 *
 * Or add to package.json scripts:
 *   "admin:seed": "dotenv -e .env.local -- npx tsx scripts/seed-admin.ts"
 * Then run: npm run admin:seed your@email.com
 */

import { PrismaClient } from "@prisma/client";

const email          = process.argv[2];
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL   ?? "";
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!email) {
  console.error("❌  Usage: npx tsx scripts/seed-admin.ts your-email@example.com");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error("❌  Missing env vars. Run with dotenv:");
  console.error("   dotenv -e .env.local -- npx tsx scripts/seed-admin.ts " + email);
  process.exit(1);
}

async function main() {
  console.log(`\n🔍  Looking up user: ${email}`);

  // ── 1. Find user in Supabase Auth by email ────────────────────────
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        "apikey":        SUPABASE_SERVICE,
        "Authorization": `Bearer ${SUPABASE_SERVICE}`,
      },
    }
  );

  if (!listRes.ok) {
    const err = await listRes.text();
    console.error("❌  Supabase API error:", err);
    process.exit(1);
  }

  const listData = await listRes.json();
  const users    = listData.users ?? [];
  const user     = users.find((u: any) =>
    u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.error(`❌  No user found with email: ${email}`);
    console.error("    Make sure they have signed up first.");
    process.exit(1);
  }

  console.log(`✅  Found user: ${user.id} (${user.email})`);
  const currentRole = user.user_metadata?.role ?? user.app_metadata?.role ?? "(none)";
  console.log(`    Current role: ${currentRole}`);

  if (currentRole === "super_admin") {
    console.log("ℹ️   User is already super_admin. Nothing to do.");
    process.exit(0);
  }

  // ── 2. Update Supabase user_metadata ─────────────────────────────
  console.log("\n📝  Updating Supabase user_metadata...");

  const updateRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
    {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "apikey":        SUPABASE_SERVICE,
        "Authorization": `Bearer ${SUPABASE_SERVICE}`,
      },
      body: JSON.stringify({
        user_metadata: {
          ...user.user_metadata,
          role: "super_admin",
        },
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error("❌  Failed to update user metadata:", err);
    process.exit(1);
  }

  console.log("✅  Supabase metadata updated → role: super_admin");

  // ── 3. Update Postgres Profile row ───────────────────────────────
  console.log("\n📝  Updating Postgres Profile row...");

  const prisma = new PrismaClient();
  try {
    await (prisma as any).profile.upsert({
      where:  { supabaseUserId: user.id },
      update: { role: "super_admin", updatedAt: new Date() },
      create: {
        supabaseUserId: user.id,
        role:           "super_admin",
        fullName:       user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
      },
    });
    console.log("✅  Profile row updated → role: super_admin");
  } catch (err: any) {
    console.warn("⚠️   Could not update Postgres Profile (DB may not be configured):", err.message);
    console.warn("    The Supabase metadata update above is sufficient for login.");
  } finally {
    await prisma.$disconnect();
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉  ${email} is now a Super Admin!

Next steps:
  1. Sign out of TicketForge if you're currently logged in
  2. Sign back in — your new role will take effect immediately
  3. The Admin Hub will appear in the sidebar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(err => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
