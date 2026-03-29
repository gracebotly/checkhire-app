import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/stats — Platform-wide admin statistics.
 */
export const GET = withApiHandler(async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const [
    { count: totalEmployers },
    { count: activeListings },
    { count: totalApplications },
    { count: pendingFlags },
    { count: pendingMlm },
    { count: totalFlags },
  ] = await Promise.all([
    supabaseAdmin.from("employers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("job_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("applications").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("flags").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("job_listings").select("id", { count: "exact", head: true }).eq("status", "review_pending"),
    supabaseAdmin.from("flags").select("id", { count: "exact", head: true }),
  ]);

  const { data: recentFlags } = await supabaseAdmin
    .from("flags")
    .select("id, target_type, target_id, reason, severity_weight, status, reporter_type, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    ok: true,
    stats: {
      total_employers: totalEmployers ?? 0,
      active_listings: activeListings ?? 0,
      total_applications: totalApplications ?? 0,
      pending_flags: pendingFlags ?? 0,
      pending_mlm_review: pendingMlm ?? 0,
      total_flags: totalFlags ?? 0,
    },
    recent_flags: recentFlags || [],
  });
});
