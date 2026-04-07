import { type EmailOtpType, createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", error.message);
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  let welcomeDisplayName: string | null = null;
  const profileWasMissing = !profile;

  if (!profile) {
    const displayName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User";

    welcomeDisplayName = displayName;

    const profileSlug =
      displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" +
      user.id.substring(0, 8);

    await supabaseAdmin.from("user_profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.name || user.user_metadata?.full_name || null,
      display_name: displayName,
      email: user.email || null,
      profile_slug: profileSlug,
    });
  }

  // Fire the welcome email AFTER email confirmation succeeds.
  // Gated strictly on signup type + new profile + real email address,
  // so it does NOT fire on password recovery, email change, invites,
  // or re-confirmations.
  if ((type === "email" || type === "signup") && profileWasMissing && user.email) {
    sendWelcomeEmail({
      to: user.email,
      userName: welcomeDisplayName,
    }).catch((err) => {
      console.error("[auth/confirm] Welcome email failed:", err);
    });
  }

  // Handle redirect based on OTP type and next parameter
  const next = searchParams.get("next");
  const requestUrl = new URL(request.url);

  // Recovery flow → always go to reset password page
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth/reset-password", request.url));
  }

  if (next) {
    try {
      // Relative path like "/auth/post-login"
      if (next.startsWith("/")) {
        return NextResponse.redirect(new URL(next, request.url));
      }

      // Absolute URL like "https://www.checkhire.co/auth/post-login"
      const nextUrl = new URL(next);
      if (nextUrl.origin === requestUrl.origin) {
        return NextResponse.redirect(nextUrl);
      }

      console.warn("[auth/confirm] Rejected cross-origin next redirect:", {
        next,
        requestOrigin: requestUrl.origin,
      });
    } catch (err) {
      console.warn("[auth/confirm] Invalid next redirect:", { next, err });
    }
  }

  // Safe default for all non-recovery confirmations:
  // let /auth/post-login decide between restored wizard flow vs /settings.
  return NextResponse.redirect(new URL("/auth/post-login", request.url));
}
