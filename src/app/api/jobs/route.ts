import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/jobs — Public job listings with filtering, sorting, and pagination.
 *
 * Query params:
 *   search    - keyword search (matches title, description, category)
 *   jobType   - comma-separated: full_time,part_time,contract,gig,temp
 *   payType   - comma-separated: salary,hourly,commission,project
 *   remoteType - comma-separated: full_remote,hybrid,onsite
 *   tier      - comma-separated: 1,2,3
 *   salaryMin - minimum salary (integer)
 *   salaryMax - maximum salary (integer)
 *   category  - single category string
 *   datePosted - 1,7,30 (days ago)
 *   hideCommissionOnly - "true" to exclude 100% commission roles
 *   sortBy    - newest (default), highest_tier, highest_salary
 *   page      - page number (default 1)
 *   limit     - results per page (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  // Parse params
  const search = searchParams.get("search")?.trim() || null;
  const jobTypes = searchParams.get("jobType")?.split(",").filter(Boolean) || [];
  const payTypes = searchParams.get("payType")?.split(",").filter(Boolean) || [];
  const remoteTypes = searchParams.get("remoteType")?.split(",").filter(Boolean) || [];
  const tiers = searchParams.get("tier")?.split(",").map(Number).filter(Boolean) || [];
  const salaryMin = searchParams.get("salaryMin") ? parseInt(searchParams.get("salaryMin")!) : null;
  const salaryMax = searchParams.get("salaryMax") ? parseInt(searchParams.get("salaryMax")!) : null;
  const category = searchParams.get("category") || null;
  const datePosted = searchParams.get("datePosted") ? parseInt(searchParams.get("datePosted")!) : null;
  const hideCommissionOnly = searchParams.get("hideCommissionOnly") === "true";
  const sortBy = searchParams.get("sortBy") || "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  // Build query — select listings joined with employer data
  let query = supabase
    .from("job_listings")
    .select(
      `
      *,
      employers!inner (
        company_name,
        tier_level,
        logo_url,
        transparency_score,
        industry,
        company_size,
        website_domain,
        description,
        country,
        slug
      )
    `,
      { count: "exact" }
    )
    .eq("status", "active");

  // ─── Filters ───
  if (search) {
    // Use ilike for basic text search across title and category
    query = query.or(
      `title.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (jobTypes.length > 0) {
    query = query.in("job_type", jobTypes);
  }

  if (payTypes.length > 0) {
    query = query.in("pay_type", payTypes);
  }

  if (remoteTypes.length > 0) {
    query = query.in("remote_type", remoteTypes);
  }

  if (tiers.length > 0) {
    query = query.in("employers.tier_level", tiers);
  }

  if (salaryMin !== null) {
    query = query.gte("salary_max", salaryMin);
  }

  if (salaryMax !== null) {
    query = query.lte("salary_min", salaryMax);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (datePosted) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - datePosted);
    query = query.gte("created_at", cutoff.toISOString());
  }

  if (hideCommissionOnly) {
    query = query.eq("is_100_percent_commission", false);
  }

  // ─── Sorting ───
  switch (sortBy) {
    case "highest_tier":
      query = query
        .order("tier_level", { referencedTable: "employers", ascending: true })
        .order("created_at", { ascending: false });
      break;
    case "highest_salary":
      query = query.order("salary_max", { ascending: false, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // ─── Pagination ───
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[api/jobs] Query error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch listings" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    listings: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
