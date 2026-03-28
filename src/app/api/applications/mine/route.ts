import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = withApiHandler(async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  const { data: applications, error } = await supabase
    .from("applications")
    .select(`
      id, pseudonym, disclosure_level, status, screening_responses, created_at,
      job_listings (
        title, slug, job_type, pay_type, salary_min, salary_max,
        remote_type, status, created_at, expires_at,
        employers ( company_name, tier_level, logo_url, slug )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/applications/mine] Query error:", error.message);
    return NextResponse.json(
      {
        ok: false,
        code: "QUERY_FAILED",
        message: "Failed to load applications.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, applications: applications || [] });
});
