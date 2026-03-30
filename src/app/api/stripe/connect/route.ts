import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST — Create or resume Stripe Connect onboarding
export const POST = withApiHandler(async () => {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_connected_account_id, stripe_onboarding_complete, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Profile not found" }, { status: 404 });

  // Already fully connected
  if (profile.stripe_connected_account_id && profile.stripe_onboarding_complete) {
    return NextResponse.json({ ok: true, already_connected: true });
  }

  let accountId = profile.stripe_connected_account_id;

  // Create new Express account if none exists
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: profile.email || user.email || undefined,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
    });
    accountId = account.id;

    // Use service client to update because we're writing a column that might not be in RLS update policy
    const serviceClient = createServiceClient();
    await serviceClient
      .from("user_profiles")
      .update({ stripe_connected_account_id: accountId })
      .eq("id", user.id);
  }

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/settings?stripe=refresh`,
    return_url: `${APP_URL}/settings?stripe=complete`,
    type: "account_onboarding",
  });

  return NextResponse.json({ ok: true, url: accountLink.url });
});

// GET — Check Connect onboarding status
export const GET = withApiHandler(async () => {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_connected_account_id, stripe_onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_connected_account_id) {
    return NextResponse.json({ ok: true, connected: false });
  }

  // If already marked complete in our DB, return fast
  if (profile.stripe_onboarding_complete) {
    return NextResponse.json({ ok: true, connected: true, details_submitted: true, charges_enabled: true, payouts_enabled: true });
  }

  // Check with Stripe
  const account = await stripe.accounts.retrieve(profile.stripe_connected_account_id);
  const isComplete = Boolean(account.details_submitted && account.charges_enabled);

  if (isComplete && !profile.stripe_onboarding_complete) {
    const serviceClient = createServiceClient();
    await serviceClient
      .from("user_profiles")
      .update({ stripe_onboarding_complete: true })
      .eq("id", user.id);
  }

  return NextResponse.json({
    ok: true,
    connected: isComplete,
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
  });
});
