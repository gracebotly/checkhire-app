import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = withApiHandler(async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: application, error } = await supabase
    .from("applications")
    .select(`
      id, pseudonym, disclosure_level, status, screening_responses,
      disclosed_at_stage2, disclosed_at_stage3, created_at,
      job_listings (
        id, title, slug, job_type, pay_type, salary_min, salary_max,
        remote_type, location_city, location_state, status,
        created_at, expires_at, requires_screening_quiz,
        employers ( company_name, tier_level, logo_url, slug, industry )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[api/applications/[id]] Query error:", error.message);
    return NextResponse.json(
      {
        ok: false,
        code: "QUERY_FAILED",
        message: "Failed to load application.",
      },
      { status: 500 }
    );
  }

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  const listing = application.job_listings as { id: string } | null;
  let questions = null;

  if (listing) {
    const { data: q } = await supabase
      .from("screening_questions")
      .select("id, question_text, question_type, options, required, sort_order")
      .eq("job_listing_id", listing.id)
      .order("sort_order", { ascending: true });
    questions = q;
  }

  return NextResponse.json({
    ok: true,
    application,
    screening_questions: questions || [],
  });
});
