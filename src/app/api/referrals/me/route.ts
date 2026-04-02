import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { generateReferralCode } from "@/lib/referrals/generate-code";

export const GET = withApiHandler(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("referral_code, referred_by")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Auto-generate referral code if missing (safety net for profiles
  // created before referral system or via OAuth without code generation)
  let referralCode = profile.referral_code;
  if (!referralCode) {
    const serviceClient = createServiceClient();
    referralCode = generateReferralCode();
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: codeError } = await serviceClient
        .from("user_profiles")
        .update({ referral_code: referralCode })
        .eq("id", user.id);

      if (!codeError) break;
      if (codeError.code === "23505") {
        referralCode = generateReferralCode();
      } else {
        console.error("[referrals/me] Failed to auto-generate referral code:", codeError);
        return NextResponse.json(
          { error: "Failed to generate referral code" },
          { status: 500 },
        );
      }
    }
  }

  const { count: totalReferrals } = await supabase
    .from("user_profiles")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", user.id);

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

  const { data: recentEarnings } = await supabase
    .from("referral_earnings")
    .select("id, deal_amount, referral_commission, status, created_at")
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.co";
  const referralLink = `${baseUrl}?ref=${referralCode}`;

  return NextResponse.json({
    referral_code: referralCode,
    referral_link: referralLink,
    stats: {
      total_referrals: totalReferrals || 0,
      total_earnings: totalEarnings,
      available_balance: availableBalance,
      paid_out: paidOut,
    },
    recent_earnings: recentEarnings || [],
  });
});
