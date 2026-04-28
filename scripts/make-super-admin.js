#!/usr/bin/env node
// @ts-check
/**
 * scripts/make-super-admin.js
 *
 * One-time script to promote an existing user account to super_admin.
 * Run after you have signed up for an account normally.
 *
 * Usage:
 *   node scripts/make-super-admin.js your-email@example.com
 *
 * Or with dotenv-cli (to load .env.local automatically):
 *   npx dotenv -e .env.local -- node scripts/make-super-admin.js your@email.com
 *
 * What it does:
 *   1. Looks up the user in Supabase Auth by email
 *   2. Updates user_metadata.role = "super_admin" via Admin API
 *      (so middleware sees the new role in the JWT immediately)
 *   3. Updates the Profile row in Postgres via Prisma
 *
 * Prerequisites:
 *   SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 *   DATABASE_URL / DIRECT_URL must be set in .env.local
 *   User must already have signed up
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("❌  Usage: node scripts/make-super-admin.js your@email.com");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("    Run with: npx dotenv -e .env.local -- node scripts/make-super-admin.js your@email.com");
  process.exit(1);
}

async function main() {
  console.log(`\n🔍  Looking up user: ${targetEmail}`);

  // ── 1. Find user in Supabase Auth ──────────────────────────────────
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(targetEmail)}`,
    {
      headers: {
        "apikey":        SUPABASE_SERVICE,
        "Authorization": `Bearer ${SUPABASE_SERVICE}`,
      },
    }
  );

  if (!listRes.ok) {
    console.error("❌  Failed to query Supabase Auth:", await listRes.text());
    process.exit(1);
  }

  const listData = await listRes.json();
  const users    = listData.users ?? [];
  const user     = users.find((u) => u.email === targetEmail);

  if (!user) {
    console.error(`❌  No account found for ${targetEmail}`);
    console.error("    Make sure this email has already signed up at /auth/signup");
    process.exit(1);
  }

  console.log(`✅  Found user: ${user.id} (${user.email})`);
  console.log(`    Current role: ${user.user_metadata?.role ?? "(none)"}`);

  // ── 2. Update Supabase user_metadata via Admin API ──────────────────
  console.log("\n📝  Updating Supabase user_metadata…");

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
    console.error("❌  Failed to update Supabase metadata:", await updateRes.text());
    process.exit(1);
  }

  console.log("✅  Supabase user_metadata.role = \"super_admin\"");

  // ── 3. Update Profile row in Postgres ───────────────────────────────
  // We use a raw pg query to avoid Prisma client version issues in scripts.
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const updated = await prisma.profile.updateMany({
      where: { supabaseUserId: user.id },
      data:  { role: "super_admin", updatedAt: new Date() },
    });

    if (updated.count === 0) {
      // Profile row doesn't exist yet — create it
      await prisma.profile.create({
        data: {
          supabaseUserId: user.id,
          role:           "super_admin",
          fullName:       user.user_metadata?.full_name ?? user.email,
        },
      });
      console.log("✅  Profile row created with role = \"super_admin\"");
    } else {
      console.log(`✅  Profile.role = "super_admin" (${updated.count} row updated)`);
    }

    await prisma.$disconnect();
  } catch (err) {
    console.warn("⚠️   Could not update Profile table (DB may not be configured):", err.message);
    console.warn("    The Supabase metadata update succeeded — role will work in middleware.");
    console.warn("    Run this SQL manually in Supabase SQL Editor to sync the Profile table:");
    console.warn(`
    UPDATE public."Profile"
    SET role = 'super_admin', "updatedAt" = now()
    WHERE "supabaseUserId" = '${user.id}';
    `);
  }

  console.log(`
╔══════════════════════════════════════════════════════╗
║  ✅  ${targetEmail} is now Super Admin!
║
║  IMPORTANT: You must log out and log back in for the
║  new role to take effect in your browser session.
║
║  After logging back in you'll see the Admin Hub in
║  the sidebar at /admin
╚══════════════════════════════════════════════════════╝
  `);
}

main().catch(err => {
  console.error("❌  Script failed:", err);
  process.exit(1);
});
