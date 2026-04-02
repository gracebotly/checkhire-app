import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateReferralCode } from "@/lib/referrals/generate-code";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  // Detect wizard flow — if the user came from CreateWizard, always go to /deal/new
  const intent = searchParams.get("intent");
  const isWizardFlow = intent === "signup";

  // Check if user_profile exists
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, referral_code")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    // Existing user — backfill referral code if missing
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

    // If wizard flow, go to /deal/new so GigCreateForm can recover sessionStorage data.
    // Otherwise, use the next param or default to dashboard.
    if (isWizardFlow) {
      return NextResponse.redirect(new URL("/deal/new?from_wizard=1", request.url));
    }
    const next = searchParams.get("next") || "/dashboard";
    return NextResponse.redirect(new URL(next, request.url));
  }

  // New user — create user_profile
  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  const profileSlug =
    displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" +
    user.id.substring(0, 8);

  // Generate referral code
  let referralCode = generateReferralCode();

  await supabaseAdmin.from("user_profiles").insert({
    id: user.id,
    full_name: user.user_metadata?.name || user.user_metadata?.full_name || null,
    display_name: displayName,
    email: user.email || null,
    profile_slug: profileSlug,
    referral_code: referralCode,
  });

  // Retry with new code if unique constraint violation
  const { data: createdProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("referral_code")
    .eq("id", user.id)
    .maybeSingle();

  if (createdProfile && !createdProfile.referral_code) {
    for (let attempt = 0; attempt < 3; attempt++) {
      referralCode = generateReferralCode();
      const { error: codeError } = await supabaseAdmin
        .from("user_profiles")
        .update({ referral_code: referralCode })
        .eq("id", user.id);

      if (!codeError) break;
      if (codeError.code !== "23505") {
        console.error("[auth/callback] Failed to set referral code:", codeError);
        break;
      }
    }
  }

  // --- REFERRAL ATTRIBUTION: Check for referral cookie ---
  const cookieHeader = request.headers.get("cookie") || "";
  const refMatch = cookieHeader.match(/checkhire_ref=(REF-[A-Z0-9]{6})/);
  const refCookie = refMatch ? refMatch[1] : null;

  if (refCookie) {
    const { data: referrer } = await supabaseAdmin
      .from("user_profiles")
      .select("id, referral_code")
      .eq("referral_code", refCookie)
      .single();

    if (referrer && referrer.id !== user.id) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ referred_by: referrer.id })
        .eq("id", user.id)
        .is("referred_by", null);

      console.log(`[Referral] User ${user.id} referred by ${referrer.id} (Google OAuth)`);
    }
  }
  // --- END REFERRAL ATTRIBUTION ---

  // Send welcome email for new users (fire-and-forget — never blocks the redirect)
  if (user.email) {
    sendWelcomeEmail({ to: user.email, userName: displayName }).catch(() => {});
  }

  // For new users from wizard flow, go to /deal/new.
  // GigCreateForm will recover the wizard data from sessionStorage.
  if (isWizardFlow) {
    return NextResponse.redirect(new URL("/deal/new?from_wizard=1", request.url));
  }
  const next = searchParams.get("next") || "/dashboard";
  return NextResponse.redirect(new URL(next, request.url));
}
