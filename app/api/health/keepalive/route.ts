export const dynamic = "force-dynamic";
/**
 * GET /api/health/keepalive
 *
 * Called daily by a Vercel cron (see vercel.json). Supabase's free tier pauses a
 * project after a week without activity, which takes the whole site down, so this
 * touches both the database and the Supabase API.
 *
 * If CRON_SECRET is set, Vercel sends it as a bearer token and we require it.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err: any) {
    console.error("[keepalive] database check failed:", err.message);
  }

  let apiOk = false;
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
      apiOk = res.ok;
    } catch (err: any) {
      console.error("[keepalive] supabase api check failed:", err.message);
    }
  }

  return NextResponse.json({ ok: dbOk, db: dbOk, api: apiOk }, { status: dbOk ? 200 : 503 });
}
