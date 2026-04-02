import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { checkoutSchema } from "@/lib/validation/escrow";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const POST = withApiHandler(async (req: Request) => {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
  }

  const { deal_id, milestone_id, fund_all } = parsed.data;

  // Fetch deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("id", deal_id)
    .maybeSingle();

  if (dealError || !deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });
  if (deal.client_user_id !== user.id) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can fund escrow" }, { status: 403 });
  // Clients can fund escrow before or after a freelancer accepts.
  // Funded deals are more trustworthy when shared and get more responses.

  let amount: number;
  let productName: string;
  let metadataMilestoneId = "";

  if (milestone_id && !fund_all) {
    // Fund single milestone
    const { data: milestone } = await supabase
      .from("milestones")
      .select("*")
      .eq("id", milestone_id)
      .eq("deal_id", deal_id)
      .maybeSingle();

    if (!milestone) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
    if (milestone.status !== "pending_funding") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Milestone already funded" }, { status: 400 });

    amount = milestone.amount;
    productName = `${deal.title} — ${milestone.title}`;
    metadataMilestoneId = milestone_id;
  } else if (fund_all && deal.has_milestones) {
    // Fund all unfunded milestones at once
    const { data: milestones } = await supabase
      .from("milestones")
      .select("*")
      .eq("deal_id", deal_id)
      .eq("status", "pending_funding");

    if (!milestones || milestones.length === 0) return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "No unfunded milestones" }, { status: 400 });

    amount = milestones.reduce((sum, m) => sum + m.amount, 0);
    productName = `${deal.title} — All milestones`;
    metadataMilestoneId = "all";
  } else {
    // Fund entire deal (non-milestone)
    if (deal.escrow_status !== "unfunded") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Escrow already funded" }, { status: 400 });
    amount = deal.total_amount;
    productName = deal.title;
  }

  const platformFee = Math.round(amount * 0.05);
  // Pass Stripe processing fee through to client (2.9% + $0.30)
  // Formula: total = (amount + platformFee + 30) / (1 - 0.029)
  // This ensures after Stripe takes 2.9% + $0.30, the remainder covers amount + platformFee exactly
  const subtotal = amount + platformFee;
  const totalBeforeStripeCents = Math.round((subtotal + 30) / (1 - 0.029));
  const stripeFee = totalBeforeStripeCents - subtotal;
  const totalCharge = totalBeforeStripeCents;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: productName,
          description: "Escrow payment on CheckHire",
        },
        unit_amount: totalCharge,
      },
      quantity: 1,
    }],
    metadata: {
      deal_id: deal.id,
      milestone_id: metadataMilestoneId,
      escrow_amount: amount.toString(),
      platform_fee: platformFee.toString(),
      stripe_fee: stripeFee.toString(),
    },
    success_url: `${APP_URL}/deal/${deal.deal_link_slug}?funded=true`,
    cancel_url: `${APP_URL}/deal/${deal.deal_link_slug}?funded=cancelled`,
  });

  return NextResponse.json({ ok: true, url: session.url });
});
