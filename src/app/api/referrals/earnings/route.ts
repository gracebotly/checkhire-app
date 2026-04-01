import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)),
  );
  const offset = (page - 1) * limit;

  const { count: total } = await supabase
    .from("referral_earnings")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", user.id);

  const { data: earnings, error } = await supabase
    .from("referral_earnings")
    .select(
      "id, deal_amount, platform_fee, net_platform_revenue, referral_commission, status, created_at",
    )
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    earnings: earnings || [],
    pagination: {
      page,
      limit,
      total: total || 0,
      total_pages: Math.ceil((total || 0) / limit),
    },
  });
});
