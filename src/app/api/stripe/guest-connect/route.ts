import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyGuestToken } from "@/lib/deals/guestToken";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST — Create or resume guest Stripe Connect onboarding
export const POST = withApiHandler(async (req: Request) => {
  const stripe = getStripe();
  const supabase = createServiceClient();

  const contentType = req.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json(
      { ok: false, code: "INVALID_CONTENT_TYPE", message: "Content-Type must be application/json" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { deal_id, guest_token } = body as { deal_id?: string; guest_token?: string };

  if (!deal_id || !guest_token) {
    return NextResponse.json(
      { ok: false, code: "INVALID_INPUT", message: "deal_id and guest_token required" },
      { status: 400 }
    );
  }

  // Fetch the deal
  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", deal_id)
    .maybeSingle();

  if (!deal) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Deal not found" },
      { status: 404 }
    );
  }

  // Verify this is a guest-freelancer deal
  if (!deal.guest_freelancer_email) {
    return NextResponse.json(
      { ok: false, code: "INVALID_DEAL", message: "This deal does not have a guest freelancer" },
      { status: 400 }
    );
  }

  // Verify guest token matches using the existing HMAC verification
  if (!verifyGuestToken(guest_token, deal.id, deal.guest_freelancer_email)) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Invalid guest token" },
      { status: 401 }
    );
  }

  let accountId = deal.guest_freelancer_stripe_account_id as string | null;

  // If an account already exists, check its onboarding status directly from Stripe
  if (accountId) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      if (account.details_submitted && account.charges_enabled) {
        return NextResponse.json({ ok: true, already_connected: true });
      }
    } catch (err) {
      // If the account lookup fails (e.g., account deleted), fall through and create a new one
      console.error("[stripe/guest-connect] Failed to retrieve existing account:", err);
      accountId = null;
    }
  }

  // Create new Express account if none exists
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: deal.guest_freelancer_email,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      metadata: {
        deal_id: deal.id,
        guest_freelancer_email: deal.guest_freelancer_email,
      },
    });
    accountId = account.id;

    // Store on the deal row
    await supabase
      .from("deals")
      .update({ guest_freelancer_stripe_account_id: accountId })
      .eq("id", deal.id);
  }

  // Create account link for onboarding — returns to the deal page
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/deal/${deal.deal_link_slug}?stripe=refresh`,
    return_url: `${APP_URL}/deal/${deal.deal_link_slug}?stripe=complete`,
    type: "account_onboarding",
  });

  return NextResponse.json({ ok: true, url: accountLink.url });
});
