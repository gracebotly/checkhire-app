import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const filter = url.searchParams.get("filter") || "all";
  const sort = url.searchParams.get("sort") || "newest";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const serviceClient = createServiceClient();

  let query = serviceClient
    .from("user_profiles")
    .select("*", { count: "exact" });

  // ── Filters ──
  if (filter === "suspended") {
    query = query.eq("suspended", true);
  } else if (filter === "admins") {
    query = query.eq("is_platform_admin", true);
  } else if (filter === "active") {
    // Active = not suspended and not admin (regular active users)
    query = query.eq("suspended", false).eq("is_platform_admin", false);
  } else if (filter === "has_deals") {
    // Users who have completed at least 1 deal
    query = query.gt("completed_deals_count", 0);
  } else if (filter === "new") {
    // Users with 0 completed deals (brand new)
    query = query.eq("completed_deals_count", 0).eq("trust_badge", "new");
  } else if (filter === "stripe_connected") {
    query = query.eq("stripe_onboarding_complete", true);
  } else if (filter === "trusted_plus") {
    // Users with trust badge of "trusted" or "established"
    query = query.in("trust_badge", ["trusted", "established"]);
  }
  // "all" = no filter applied

  // ── Search ──
  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // ── Sort ──
  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "most_deals") {
    query = query.order("completed_deals_count", { ascending: false });
  } else if (sort === "highest_rated") {
    query = query.order("average_rating", { ascending: false, nullsFirst: false });
  } else if (sort === "alphabetical") {
    query = query.order("display_name", { ascending: true, nullsFirst: false });
  } else {
    // Default: newest first
    query = query.order("created_at", { ascending: false });
  }

  const { data: users, count, error } = await query
    .range(offset, offset + pageSize - 1);

  if (error)
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );

  // Enrich users with role breakdown (client vs freelancer deal counts)
  const enriched = [];
  for (const user of users || []) {
    const { count: dealsAsClient } = await serviceClient
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("client_user_id", user.id);

    const { count: dealsAsFreelancer } = await serviceClient
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("freelancer_user_id", user.id);

    enriched.push({
      ...user,
      deals_as_client: dealsAsClient || 0,
      deals_as_freelancer: dealsAsFreelancer || 0,
    });
  }

  return NextResponse.json({
    ok: true,
    users: enriched,
    total: count || 0,
    page,
    pageSize,
  });
});
