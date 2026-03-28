import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employer/dashboard — Returns employer dashboard stats.
 */
export const GET = withApiHandler(async function GET() {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Count active listings
  const { count: activeCount } = await supabaseAdmin
    .from("job_listings")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", ctx.employerId)
    .eq("status", "active");

  // Count total listings (all statuses)
  const { count: totalCount } = await supabaseAdmin
    .from("job_listings")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", ctx.employerId);

  // Next expiration among active listings
  const { data: nextExpiring } = await supabaseAdmin
    .from("job_listings")
    .select("id, title, slug, expires_at")
    .eq("employer_id", ctx.employerId)
    .eq("status", "active")
    .order("expires_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Recent listings (up to 5)
  const { data: recentListings } = await supabaseAdmin
    .from("job_listings")
    .select(
      `id, title, slug, status, current_application_count, max_applications,
       created_at, expires_at`
    )
    .eq("employer_id", ctx.employerId)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    ok: true,
    stats: {
      active_listings: activeCount ?? 0,
      total_listings: totalCount ?? 0,
      total_applications: 0, // Applications table doesn't exist yet — Slice 3
      next_expiration: nextExpiring
        ? {
            title: nextExpiring.title,
            slug: nextExpiring.slug,
            expires_at: nextExpiring.expires_at,
          }
        : null,
    },
    recent_listings: recentListings || [],
  });
});
