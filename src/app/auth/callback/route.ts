import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const intent = searchParams.get("intent") ?? "signin";

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

  // Check if user_profile exists
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    // Existing user — route based on user_type
    if (profile.user_type === "employer") {
      return NextResponse.redirect(new URL("/employer/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/jobs", request.url));
  }

  // New user signing up — create user_profile
  if (intent === "signup") {
    const userType = searchParams.get("user_type") ?? "job_seeker";
    const validType = userType === "employer" ? "employer" : "job_seeker";

    await supabaseAdmin.from("user_profiles").insert({
      id: user.id,
      user_type: validType,
      full_name: user.user_metadata?.name || null,
    });

    if (validType === "employer") {
      return NextResponse.redirect(new URL("/employer/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/jobs", request.url));
  }

  // Signin but no profile — shouldn't happen, send to jobs as fallback
  return NextResponse.redirect(new URL("/jobs", request.url));
}
