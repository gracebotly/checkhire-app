export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateReferralCode } from "@/lib/referrals/generate-code";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Code exchange failed:", error.message);
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[auth/callback] No user after code exchange");
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  // Create service client at REQUEST TIME (not module level)
  // This ensures env vars are available in Vercel's serverless environment
  const supabaseAdmin = createServiceClient();

  // Check if user_profile exists
  // The database trigger on auth.users should have already created it,
  // but we check to handle edge cases and backfill missing data
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, referral_code, email, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    // ── EXISTING USER (or trigger already created the profile) ──

    // Backfill referral code if missing
    if (!profile.referral_code) {
      let referralCode = generateReferralCode();
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: codeError } = await supabaseAdmin
          .from("user_profiles")
          .update({ referral_code: referralCode })
          .eq("id", user.id);

        if (!codeError) break;
        if (codeError.code === "23505") {
          referralCode = generateReferralCode();
        } else {
          console.error("[auth/callback] Failed to backfill referral code:", codeError);
          break;
        }
      }
    }

    // Backfill email if missing (trigger may not have had it)
    if (!profile.email && user.email) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ email: user.email })
        .eq("id", user.id);
    }

    // Backfill display_name from Google metadata if the trigger set a generic one
    const googleName = user.user_metadata?.name || user.user_metadata?.full_name;
    if (googleName && (!profile.display_name || profile.display_name === user.email?.split("@")[0])) {
      await supabaseAdmin
        .from("user_profiles")
        .update({
          display_name: googleName,
          full_name: googleName,
        })
        .eq("id", user.id);
    }

    // Referral attribution from cookie
    await attributeReferral(supabaseAdmin, user.id, request);

    // Redirect — check if there's a next param (e.g., from login page)
    const next = searchParams.get("next");
    if (next) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    // Otherwise go through post-login router to check for wizard data
    return NextResponse.redirect(new URL("/auth/post-login", request.url));
  }

  // ── NEW USER — trigger failed or race condition ──
  // This is the fallback. The trigger should have created the profile,
  // but if it didn't (e.g., unique constraint collision on slug/code),
  // we create it here with upsert + retries.

  console.warn("[auth/callback] No profile found after trigger — creating via fallback");

  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  const profileSlug =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    user.id.substring(0, 8);

  let referralCode = generateReferralCode();
  let profileCreated = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error: upsertError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.name || user.user_metadata?.full_name || null,
          display_name: displayName,
          email: user.email || null,
          profile_slug: attempt === 0 ? profileSlug : `${profileSlug}-${attempt}`,
          referral_code: referralCode,
          current_mode: inferModeFromRedirect(searchParams.get("redirect") || searchParams.get("next") || ""),
        },
        { onConflict: "id" }
      );

    if (!upsertError) {
      profileCreated = true;
      break;
    }

    console.error(`[auth/callback] Fallback upsert attempt ${attempt + 1} failed:`, upsertError);

    // Retry with new referral code on unique constraint violation
    if (upsertError.code === "23505") {
      if (upsertError.message?.includes("referral_code")) {
        referralCode = generateReferralCode();
      }
      // If slug collision, the next iteration appends the attempt number
      continue;
    }

    // Non-retryable error
    break;
  }

  if (!profileCreated) {
    console.error("[auth/callback] CRITICAL: Failed to create profile for user:", user.id);
    // Still redirect — the user has an auth session, they'll just have a degraded experience
    // until the profile is manually created
  }

  // Referral attribution from cookie
  await attributeReferral(supabaseAdmin, user.id, request);

  // Send welcome email for genuinely new users
  if (user.email) {
    sendWelcomeEmail({ to: user.email, userName: displayName }).catch((err) => {
      console.error("[auth/callback] Welcome email failed:", err);
    });
  }

  // Redirect — new users always go through post-login client router
  // which checks sessionStorage for wizard data.
  // We can't rely on ?intent=signup because Supabase strips custom
  // query params from redirectTo during the OAuth chain.
  // See: https://github.com/orgs/supabase/discussions/21110
  return NextResponse.redirect(new URL("/auth/post-login", request.url));
}

// ── Helper: Referral Attribution ──
async function attributeReferral(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  userId: string,
  request: Request
) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const refMatch = cookieHeader.match(/checkhire_ref=(REF-[A-Z0-9]{6})/);
    const refCookie = refMatch ? refMatch[1] : null;

    if (!refCookie) return;

    const { data: referrer } = await supabaseAdmin
      .from("user_profiles")
      .select("id, referral_code")
      .eq("referral_code", refCookie)
      .single();

    if (referrer && referrer.id !== userId) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ referred_by: referrer.id })
        .eq("id", userId)
        .is("referred_by", null);

      console.log(`[Referral] User ${userId} referred by ${referrer.id} (Google OAuth)`);
    }
  } catch (err) {
    console.error("[auth/callback] Referral attribution error:", err);
  }
}

// ── Helper: Infer UI mode from redirect URL ──
function inferModeFromRedirect(redirect: string): "client" | "freelancer" | null {
  if (!redirect) return null;
  // Coming from the create wizard → client mode
  if (redirect.includes("from_wizard") || redirect.includes("/deal/new")) return "client";
  // Coming from a deal page (applying/accepting) → freelancer mode
  if (redirect.includes("/deal/") && redirect.includes("submit_pitch")) return "freelancer";
  if (redirect.includes("/deal/") && redirect.includes("accept=true")) return "freelancer";
  // Coming from /gigs (browsing open gigs) → freelancer mode
  if (redirect.includes("/gigs")) return "freelancer";
  return null;
}
