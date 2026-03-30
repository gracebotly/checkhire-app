import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { instantPayoutSchema } from "@/lib/validation/escrow";

export const POST = withApiHandler(async (req: Request) => {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const parsed = instantPayoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

  const { amount } = parsed.data;

  const { data: profile } = await supabase.from("user_profiles").select("stripe_connected_account_id, stripe_onboarding_complete").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_connected_account_id || !profile.stripe_onboarding_complete) {
    return NextResponse.json({ ok: false, code: "STRIPE_NOT_CONNECTED", message: "Stripe account not connected" }, { status: 400 });
  }

  // Fee: $1 or 1%, whichever is greater
  const fee = Math.max(100, Math.round(amount * 0.01));
  const netPayout = amount - fee;

  if (netPayout <= 0) {
    return NextResponse.json({ ok: false, code: "AMOUNT_TOO_LOW", message: "Amount too low for instant payout after fees" }, { status: 400 });
  }

  try {
    const payout = await stripe.payouts.create(
      { amount: netPayout, currency: "usd", method: "instant" },
      { stripeAccount: profile.stripe_connected_account_id }
    );
    return NextResponse.json({ ok: true, payout_id: payout.id, payout_amount: netPayout, fee });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Instant payout failed";
    // Common: freelancer's card doesn't support instant payouts
    return NextResponse.json({ ok: false, code: "PAYOUT_FAILED", message }, { status: 400 });
  }
});
