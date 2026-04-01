import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceClient = createServiceClient();

  const { data: referredUsers } = await serviceClient
    .from("user_profiles")
    .select("referred_by")
    .not("referred_by", "is", null);

  const uniqueReferrers = new Set((referredUsers || []).map((u) => u.referred_by));
  const totalReferredUsers = (referredUsers || []).length;

  const { data: allEarnings } = await serviceClient
    .from("referral_earnings")
    .select("referral_commission, status");

  const totalCommissionsEarned = (allEarnings || []).reduce(
    (sum, e) => sum + e.referral_commission,
    0,
  );
  const totalCommissionsPaid = (allEarnings || [])
    .filter((e) => e.status === "paid_out")
    .reduce((sum, e) => sum + e.referral_commission, 0);

  const { data: pendingPayouts } = await serviceClient
    .from("referral_payouts")
    .select("id, user_id, amount, method, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const enrichedPayouts = [];
  for (const payout of pendingPayouts || []) {
    const { data: payoutUser } = await serviceClient
      .from("user_profiles")
      .select("display_name")
      .eq("id", payout.user_id)
      .single();

    enrichedPayouts.push({
      ...payout,
      display_name: payoutUser?.display_name || "Unknown",
    });
  }

  const { count: totalClicks } = await serviceClient
    .from("referral_clicks")
    .select("id", { count: "exact", head: true });

  const { count: convertedClicks } = await serviceClient
    .from("referral_clicks")
    .select("id", { count: "exact", head: true })
    .eq("converted", true);

  const conversionRate =
    (totalClicks || 0) > 0
      ? ((convertedClicks || 0) / (totalClicks || 1)) * 100
      : 0;

  const topReferrersMap = new Map<string, number>();
  for (const u of referredUsers || []) {
    if (u.referred_by) {
      topReferrersMap.set(
        u.referred_by,
        (topReferrersMap.get(u.referred_by) || 0) + 1,
      );
    }
  }

  const sortedReferrerIds = [...topReferrersMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const topReferrers = [];
  for (const [referrerId, count] of sortedReferrerIds) {
    const { data: refUser } = await serviceClient
      .from("user_profiles")
      .select("id, display_name, referral_code")
      .eq("id", referrerId)
      .single();

    const { data: refEarnings } = await serviceClient
      .from("referral_earnings")
      .select("referral_commission")
      .eq("referrer_user_id", referrerId);

    const totalRefEarnings = (refEarnings || []).reduce(
      (sum, e) => sum + e.referral_commission,
      0,
    );

    topReferrers.push({
      user_id: referrerId,
      display_name: refUser?.display_name || "Unknown",
      referral_code: refUser?.referral_code || "",
      total_referrals: count,
      total_earnings: totalRefEarnings,
    });
  }

  const { data: recentEarnings } = await serviceClient
    .from("referral_earnings")
    .select(
      "id, referrer_user_id, referred_user_id, deal_amount, referral_commission, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    overview: {
      total_referrers: uniqueReferrers.size,
      total_referred_users: totalReferredUsers,
      total_commissions_earned: totalCommissionsEarned,
      total_commissions_paid: totalCommissionsPaid,
      pending_payouts: (pendingPayouts || []).length,
      total_clicks: totalClicks || 0,
      conversion_rate: Math.round(conversionRate * 10) / 10,
    },
    top_referrers: topReferrers,
    pending_payouts: enrichedPayouts,
    recent_earnings: recentEarnings || [],
  });
});
