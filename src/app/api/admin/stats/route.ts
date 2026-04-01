import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async () => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const serviceClient = createServiceClient();

  // Total deals
  const { count: totalDeals } = await serviceClient
    .from("deals")
    .select("id", { count: "exact", head: true });

  // Active deals
  const { count: activeDeals } = await serviceClient
    .from("deals")
    .select("id", { count: "exact", head: true })
    .in("status", ["funded", "in_progress", "submitted", "revision_requested"]);

  // Completed deals
  const { count: completedDeals } = await serviceClient
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");

  // Total volume + average (completed deals)
  const { data: volumeData } = await serviceClient
    .from("deals")
    .select("total_amount")
    .eq("status", "completed");

  const totalVolume = volumeData?.reduce((s, d) => s + d.total_amount, 0) || 0;
  const avgDealSize =
    volumeData && volumeData.length > 0
      ? Math.round(totalVolume / volumeData.length)
      : 0;

  // Dispute rate
  const { count: totalDisputes } = await serviceClient
    .from("disputes")
    .select("id", { count: "exact", head: true });

  const disputeRate =
    completedDeals && completedDeals > 0
      ? Number(((totalDisputes || 0) / completedDeals).toFixed(4))
      : 0;

  // Average rating
  const { data: ratingData } = await serviceClient
    .from("ratings")
    .select("stars");

  const avgRating =
    ratingData && ratingData.length > 0
      ? Number(
          (
            ratingData.reduce((s, r) => s + r.stars, 0) / ratingData.length
          ).toFixed(2)
        )
      : null;

  // Active users (30 days)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: activeUserDeals } = await serviceClient
    .from("deals")
    .select("client_user_id, freelancer_user_id")
    .gte("updated_at", thirtyDaysAgo);

  const activeUserIds = new Set<string>();
  for (const d of activeUserDeals || []) {
    if (d.client_user_id) activeUserIds.add(d.client_user_id);
    if (d.freelancer_user_id) activeUserIds.add(d.freelancer_user_id);
  }

  // Open disputes count
  const { count: openDisputes } = await serviceClient
    .from("disputes")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "under_review"]);

  // Total registered users
  const { count: totalUsers } = await serviceClient
    .from("user_profiles")
    .select("id", { count: "exact", head: true });

  // Revenue: 5% platform fee on completed deals
  const platformFees = Math.round(totalVolume * 0.05);
  // Stripe fee estimate: 2.9% + $0.30 per transaction on the total charged
  // Total charged = deal amount + 5% fee, so Stripe fee ≈ 2.9% of (volume * 1.05) + $0.30 * completed deals
  const estimatedStripeFees =
    Math.round(totalVolume * 1.05 * 0.029) +
    (completedDeals || 0) * 30;
  const netRevenue = platformFees - estimatedStripeFees;

  // Active funded escrow (deals currently holding money)
  const { data: fundedDeals } = await serviceClient
    .from("deals")
    .select("total_amount")
    .in("escrow_status", ["funded", "partially_released", "frozen"]);
  const fundedEscrow = fundedDeals?.reduce((s, d) => s + d.total_amount, 0) || 0;

  return NextResponse.json({
    ok: true,
    stats: {
      total_deals: totalDeals || 0,
      active_deals: activeDeals || 0,
      completed_deals: completedDeals || 0,
      total_volume_cents: totalVolume,
      average_deal_size_cents: avgDealSize,
      dispute_rate: disputeRate,
      average_rating: avgRating,
      active_users_30d: activeUserIds.size,
      open_disputes: openDisputes || 0,
      total_users: totalUsers || 0,
      platform_fees_cents: platformFees,
      estimated_stripe_fees_cents: estimatedStripeFees,
      net_revenue_cents: netRevenue,
      funded_escrow_cents: fundedEscrow,
    },
  });
});
