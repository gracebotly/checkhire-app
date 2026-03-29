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
 * GET /api/admin/listings/review — MLM review queue
 */
export const GET = withApiHandler(async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("is_platform_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_platform_admin) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const { data: listings, error } = await supabaseAdmin
    .from("job_listings")
    .select("id, title, slug, description, mlm_flag_score, employer_id, created_at, employers(company_name, slug)")
    .eq("status", "review_pending")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, code: "QUERY_FAILED", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, listings: listings || [] });
});
