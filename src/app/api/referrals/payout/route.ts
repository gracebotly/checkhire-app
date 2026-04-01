import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { referralPayoutSchema } from "@/lib/validation/referrals";

export const POST = withApiHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = referralPayoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { data: earnings } = await supabase
    .from("referral_earnings")
    .select("referral_commission, status")
    .eq("referrer_user_id", user.id);

  const totalEarnings = (earnings || []).reduce(
    (sum, e) => sum + e.referral_commission,
    0,
  );
  const paidOut = (earnings || [])
    .filter((e) => e.status === "paid_out")
    .reduce((sum, e) => sum + e.referral_commission, 0);
  const availableBalance = totalEarnings - paidOut;

  if (availableBalance < 2500) {
    return NextResponse.json(
      {
        error: `Minimum payout is $25.00. Your current balance is $${(availableBalance / 100).toFixed(2)}.`,
      },
      { status: 400 },
    );
  }

  const { data: payout, error: payoutError } = await supabase
    .from("referral_payouts")
    .insert({
      user_id: user.id,
      amount: availableBalance,
      method: parsed.data.method,
      status: "pending",
    })
    .select()
    .single();

  if (payoutError) {
    console.error("[Referral] Payout creation failed:", payoutError);
    return NextResponse.json(
      { error: "Failed to create payout request" },
      { status: 500 },
    );
  }

  return NextResponse.json({ payout });
});
