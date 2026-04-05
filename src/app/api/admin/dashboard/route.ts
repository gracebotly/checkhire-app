import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async () => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const supabase = createServiceClient();

  // Run all counts in parallel
  const [
    pendingReviewResult,
    openDisputesResult,
    escalatedDisputesResult,
    pendingScamChecksResult,
    pendingPayoutsResult,
    recentFundedResult,
    flaggedDealsResult,
  ] = await Promise.all([
    // Deals awaiting moderation review
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "pending")
      .not("status", "in", "(cancelled,refunded)"),

    // Open disputes
    supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),

    // Escalated disputes (under_review = needs human decision)
    supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "under_review"),

    // Pending scam check submissions
    supabase
      .from("scam_submissions")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "investigating"]),

    // Pending referral payouts
    supabase
      .from("referral_payouts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    // Deals funded in last 7 days (recent revenue)
    supabase
      .from("deals")
      .select("id, total_amount", { count: "exact" })
      .eq("escrow_status", "funded")
      .gte("funded_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // Currently flagged deals (flagged but not yet reviewed)
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("flagged_for_review", true)
      .eq("review_status", "pending"),
  ]);

  // Calculate recent funded volume
  const recentFundedVolume = (recentFundedResult.data || []).reduce(
    (sum: number, d: { total_amount: number }) => sum + d.total_amount,
    0
  );

  return NextResponse.json({
    ok: true,
    dashboard: {
      pending_review: pendingReviewResult.count || 0,
      open_disputes: openDisputesResult.count || 0,
      escalated_disputes: escalatedDisputesResult.count || 0,
      pending_scam_checks: pendingScamChecksResult.count || 0,
      pending_payouts: pendingPayoutsResult.count || 0,
      flagged_deals: flaggedDealsResult.count || 0,
      recent_funded_count: recentFundedResult.count || 0,
      recent_funded_volume_cents: recentFundedVolume,
    },
  });
});
