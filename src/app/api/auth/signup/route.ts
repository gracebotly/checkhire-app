import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { generateReferralCode } from "@/lib/referrals/generate-code";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";
import { notifyAdmin } from "@/lib/slack/notify";
import { newUserSignup } from "@/lib/slack/templates";

export const runtime = "nodejs";

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

function siteUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.startsWith("http")) return env;
  return new URL(req.url).origin;
}

export const POST = withApiHandler(async function POST(request: NextRequest) {
  const supabase = await createClient();
  const supabaseService = createServiceClient();
  const body = await request
    .json()
    .catch(() => ({} as Record<string, unknown>));

  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required." },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, message: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, message: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({ intent: "signup" });
  const redirectTo = `${siteUrl(request)}/auth/callback?${params.toString()}`;

  // Check if the user was already created by the client-side signUp call.
  // If so, skip the server-side signUp to avoid sending a duplicate
  // confirmation email.
  const { data: existingUser } = await supabaseService
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let newUserId: string;
  let hasSession = false;

  if (existingUser) {
    // User already exists (client-side signUp ran first).
    // Skip signUp, just ensure profile data is complete.
    newUserId = existingUser.id;
  } else {
    // No existing user — do the full signUp.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error("[auth/signup] Supabase error", {
        message: error.message,
        name: error.name,
      });
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }

    if (!data.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Signup succeeded but no user was returned." },
        { status: 500 },
      );
    }

    newUserId = data.user.id;
    hasSession = Boolean(data.session);
  }

  // Determine initial mode from context
  // If the user signed up from an application flow, they're a freelancer
  // If they signed up from the create wizard, they're a client
  const intent = (body?.intent ?? "").toString().trim();
  const initialMode =
    intent === "freelancer" ? "freelancer" : intent === "client" ? "client" : null;

  const { error: profileError } = await supabaseService
    .from("user_profiles")
    .upsert(
      {
        id: newUserId,
        email,
        full_name: name || null,
        display_name: name || null,
        current_mode: initialMode,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error("[auth/signup] Failed to create profile", profileError);
    return NextResponse.json(
      { ok: false, message: "Failed to create user profile." },
      { status: 500 },
    );
  }

  // --- REFERRAL: Generate code + Attribute referrer ---
  let referralCode = generateReferralCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error: codeError } = await supabaseService
      .from("user_profiles")
      .update({ referral_code: referralCode })
      .eq("id", newUserId);

    if (!codeError) {
      break;
    }

    if (codeError.code === "23505") {
      referralCode = generateReferralCode();
    } else {
      console.error("[Referral] Failed to set code:", codeError);
      break;
    }
  }

  const refCookie = request.cookies.get("checkhire_ref")?.value;
  let referredByName: string | null = null;
  if (refCookie && /^REF-[A-Z0-9]{6}$/.test(refCookie)) {
    const { data: referrer } = await supabaseService
      .from("user_profiles")
      .select("id, referral_code, display_name")
      .eq("referral_code", refCookie)
      .single();

    if (referrer && referrer.id !== newUserId) {
      await supabaseService
        .from("user_profiles")
        .update({ referred_by: referrer.id })
        .eq("id", newUserId)
        .is("referred_by", null);

      referredByName = referrer.display_name || referrer.referral_code || null;
      console.log(`[Referral] User ${newUserId} referred by ${referrer.id}`);
    }
  }
  // --- END REFERRAL ---

  // Fire-and-forget — do not block signup response
  void notifyAdmin(
    newUserSignup({
      display_name: name || "New User",
      email,
      referred_by: referredByName || undefined,
    }),
  );

  // Send welcome email (non-blocking, non-fatal)
  sendWelcomeEmail({ to: email, userName: name || null }).catch(() => {});

  return NextResponse.json({ ok: true, hasSession });
});
