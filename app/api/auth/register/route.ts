export const dynamic = "force-dynamic";
/**
 * POST /api/auth/register
 * 
 * Registration is now handled entirely client-side via Supabase Auth SDK.
 * This route is kept as a no-op redirect to avoid 404s from old references.
 * 
 * The actual signup flow:
 *   app/auth/signup/page.tsx → signUpWithEmail() from lib/supabase.ts → Supabase Auth
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { 
      error: "Registration is handled via Supabase Auth client directly.",
      hint: "Use the /auth/signup page or call signUpWithEmail() from lib/supabase.ts"
    },
    { status: 410 } // 410 Gone — endpoint superseded
  );
}
