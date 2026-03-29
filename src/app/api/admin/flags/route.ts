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
 * GET /api/admin/flags?status=pending&limit=50
 */
export const GET = withApiHandler(async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("is_platform_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_platform_admin) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

  let query = supabaseAdmin
    .from("flags")
    .select("id, reporter_id, reporter_type, target_type, target_id, reason, description, status, severity_weight, resolution_notes, created_at, resolved_at")
    .order("severity_weight", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter && ["pending", "investigating", "resolved", "dismissed"].includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data: flags, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, code: "QUERY_FAILED", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, flags: flags || [] });
});
