import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const serviceClient = createServiceClient();

  let query = serviceClient
    .from("deals")
    .select(
      `*, client:user_profiles!deals_client_user_id_profile_fkey(display_name, email), freelancer:user_profiles!deals_freelancer_user_id_profile_fkey(display_name, email)`,
      { count: "exact" }
    );

  if (filter === "active") {
    query = query.in("status", ["funded", "in_progress", "submitted", "revision_requested", "disputed"]);
  } else if (filter === "completed") {
    query = query.eq("status", "completed");
  } else if (filter === "funded") {
    query = query.in("escrow_status", ["funded", "partially_released"]);
  } else if (filter === "flagged") {
    query = query.eq("flagged_for_review", true);
  }

  const { data: deals, count, error } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error)
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );

  return NextResponse.json({
    ok: true,
    deals: deals || [],
    total: count || 0,
    page,
    pageSize,
  });
});
