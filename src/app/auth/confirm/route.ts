import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createEmployerOnSignup } from "@/lib/employer/createEmployerOnSignup";

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
    return NextResponse.redirect(
      new URL("/auth/auth-code-error", request.url)
    );
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

  // User is now authenticated — check if they need a profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile && type === "email") {
      // New signup confirmation — create profile
      const userType = user.user_metadata?.user_type ?? "job_seeker";
      const validType = userType === "employer" ? "employer" : "job_seeker";

      await supabaseAdmin.from("user_profiles").insert({
        id: user.id,
        user_type: validType,
        full_name: user.user_metadata?.name || null,
      });

      // If employer, also create employer + employer_users records
      if (validType === "employer") {
        const companyName =
          user.user_metadata?.company_name || "My Company";

        await createEmployerOnSignup(user.id, companyName);
        return NextResponse.redirect(new URL("/employer/dashboard", request.url));
      }

      // Create empty seeker_profiles row for job seekers
      await supabaseAdmin.from("seeker_profiles").insert({
        id: user.id,
      });

      return NextResponse.redirect(new URL("/seeker/profile", request.url));
    }

    // Existing user — route based on type
    if (profile?.user_type === "employer") {
      return NextResponse.redirect(new URL("/employer/dashboard", request.url));
    }
  }

  return NextResponse.redirect(new URL("/seeker/applications", request.url));
}
