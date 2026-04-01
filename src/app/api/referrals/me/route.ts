import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

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
    .select("referral_code, referral_slug, referred_by")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.com";
  const referralLink = profile.referral_slug
    ? `${baseUrl}/ref/${profile.referral_slug}`
    : `${baseUrl}?ref=${profile.referral_code}`;

  return NextResponse.json({
    referral_code: profile.referral_code,
    referral_slug: profile.referral_slug,
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
