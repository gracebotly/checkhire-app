import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") || "open";

  const serviceClient = createServiceClient();

  let query = serviceClient
    .from("disputes")
    .select(
      `*, deal:deals!inner(id, title, total_amount, deal_link_slug, status, escrow_status, client_user_id, freelancer_user_id, has_milestones), initiator:user_profiles!disputes_initiated_by_fkey(display_name)`
    );

  if (statusFilter === "resolved") {
    query = query.in("status", [
      "resolved_release",
      "resolved_refund",
      "resolved_partial",
    ]);
    query = query.order("resolved_at", { ascending: false });
  } else {
    query = query.eq("status", statusFilter);
    query = query.order("created_at", { ascending: true }); // oldest first for open
  }

  const { data: disputes, error } = await query;

  if (error)
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );

  // Fetch client and freelancer profiles for each dispute
  const enriched = [];
  for (const dispute of disputes || []) {
    const deal = dispute.deal as {
      client_user_id: string;
      freelancer_user_id: string | null;
    };

    const { data: client } = await serviceClient
      .from("user_profiles")
      .select("display_name, email, trust_badge, completed_deals_count")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    let freelancer = null;
    if (deal.freelancer_user_id) {
      const { data: fp } = await serviceClient
        .from("user_profiles")
        .select("display_name, email, trust_badge, completed_deals_count")
        .eq("id", deal.freelancer_user_id)
        .maybeSingle();
      freelancer = fp;
    }

    enriched.push({ ...dispute, client, freelancer });
  }

  return NextResponse.json({ ok: true, disputes: enriched });
});
