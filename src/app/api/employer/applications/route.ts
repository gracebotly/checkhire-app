import { withApiHandler } from "@/lib/api/withApiHandler";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { buildCandidateView } from "@/lib/seeker/disclosureGate";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Application, SeekerProfile } from "@/types/database";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withApiHandler(async function GET(req: Request) {
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listing_id");
  const statusFilter = searchParams.get("status");

  if (!listingId) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_LISTING_ID",
        message: "listing_id query parameter is required.",
      },
      { status: 400 }
    );
  }

  const { data: listing } = await supabaseAdmin
    .from("job_listings")
    .select("id, employer_id")
    .eq("id", listingId)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json(
      {
        ok: false,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found or not owned by you.",
      },
      { status: 404 }
    );
  }

  let query = supabaseAdmin
    .from("applications")
    .select("*")
    .eq("job_listing_id", listingId)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: applications, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: "Failed to load applications." },
      { status: 500 }
    );
  }

  if (!applications || applications.length === 0) {
    return NextResponse.json({ ok: true, candidates: [] });
  }

  const userIds = applications.map((a: Application) => a.user_id);

  const { data: seekerProfiles } = await supabaseAdmin
    .from("seeker_profiles")
    .select("*")
    .in("id", userIds);

  const { data: userProfiles } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name")
    .in("id", userIds);

  const seekerMap = new Map(
    (seekerProfiles || []).map((sp: SeekerProfile) => [sp.id, sp])
  );
  const nameMap = new Map(
    (userProfiles || []).map((up: { id: string; full_name: string | null }) => [
      up.id,
      up.full_name,
    ])
  );

  const candidates = applications.map((app: Application) => {
    const seeker = seekerMap.get(app.user_id);
    const fullName = nameMap.get(app.user_id) || null;

    if (!seeker) {
      return {
        application_id: app.id,
        pseudonym: app.pseudonym,
        disclosure_level: app.disclosure_level,
        status: app.status,
        created_at: app.created_at,
        skills: [],
        years_experience: null,
        location_city: null,
        location_state: null,
        education_level: null,
        education_field: null,
        parsed_work_history: [],
        parsed_education: [],
        parsed_certifications: [],
        parsed_summary: null,
        screening_responses: app.screening_responses,
      };
    }

    return buildCandidateView(app, seeker as SeekerProfile, fullName);
  });

  await supabaseAdmin.from("access_audit_log").insert({
    employer_id: ctx.employerId,
    employer_user_id: ctx.userId,
    action_type: "candidate_view",
    application_id: null,
    disclosure_level_at_time: 1,
    ip_address: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true, candidates });
});
