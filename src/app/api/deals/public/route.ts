import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { publicDealsQuerySchema } from "@/lib/validation/interest";

const PAGE_SIZE = 20;

export const GET = withApiHandler(async (req: Request) => {
  const url = new URL(req.url);
  const rawParams = {
    category: url.searchParams.get("category") || undefined,
    min_amount: url.searchParams.get("min_amount") || undefined,
    max_amount: url.searchParams.get("max_amount") || undefined,
    sort: url.searchParams.get("sort") || undefined,
    page: url.searchParams.get("page") || undefined,
  };

  const parsed = publicDealsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid params" },
      { status: 400 }
    );
  }

  const { category, min_amount, max_amount, sort, page } = parsed.data;

  // Use service client to bypass RLS — public deals should be visible to anyone
  const supabase = createServiceClient();

  let query = supabase
    .from("deals")
    .select(
      `id, title, description, total_amount, currency, deadline, deal_link_slug, category, escrow_status, created_at,
       client:user_profiles!deals_client_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug)`,
      { count: "exact" }
    )
    .eq("deal_type", "public")
    .eq("status", "pending_acceptance")
    .is("freelancer_user_id", null);

  // Apply filters
  if (category) {
    query = query.eq("category", category);
  }
  if (min_amount !== undefined) {
    query = query.gte("total_amount", min_amount);
  }
  if (max_amount !== undefined) {
    query = query.lte("total_amount", max_amount);
  }

  // Apply sort
  if (sort === "highest_budget") {
    query = query.order("total_amount", { ascending: false });
  } else if (sort === "deadline_soonest") {
    query = query.order("deadline", { ascending: true, nullsFirst: false });
  } else {
    // Default: newest
    query = query.order("created_at", { ascending: false });
  }

  // Paginate
  const offset = (page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: deals, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  // Get interest counts for each deal
  const dealIds = (deals || []).map((d) => d.id);
  const interestCounts: Record<string, number> = {};

  if (dealIds.length > 0) {
    const { data: interests } = await supabase
      .from("deal_interest")
      .select("deal_id")
      .in("deal_id", dealIds)
      .eq("status", "pending");

    if (interests) {
      for (const i of interests) {
        interestCounts[i.deal_id] = (interestCounts[i.deal_id] || 0) + 1;
      }
    }
  }

  const enrichedDeals = (deals || []).map((d) => ({
    ...d,
    interested_count: interestCounts[d.id] || 0,
  }));

  return NextResponse.json({
    ok: true,
    deals: enrichedDeals,
    total: count || 0,
    page,
  });
});
