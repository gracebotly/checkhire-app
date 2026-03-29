import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { deactivateMaskedPair } from "@/lib/email/maskedEmail";
import { deleteApplicationVideos } from "@/lib/storage/videoUpload";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/seeker/data-delete
 */
export const POST = withApiHandler(async function POST(req: Request) {
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

  const body = await req.json().catch(() => ({}));

  if (body?.confirm !== "DELETE_MY_DATA") {
    return NextResponse.json(
      {
        ok: false,
        code: "CONFIRMATION_REQUIRED",
        message: 'You must send { confirm: "DELETE_MY_DATA" } to proceed.',
      },
      { status: 400 }
    );
  }

  // Verify user is a job seeker
  const { data: userProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!userProfile || userProfile.user_type !== "job_seeker") {
    return NextResponse.json(
      { ok: false, code: "NOT_SEEKER", message: "Only job seekers can delete data." },
      { status: 403 }
    );
  }

  const summary = {
    applications_withdrawn: 0,
    masked_pairs_deactivated: 0,
    videos_deleted: 0,
    resume_deleted: false,
    profile_anonymized: false,
  };

  // 1. Withdraw all active applications
  const activeStatuses = ["applied", "reviewed", "shortlisted", "interview_requested", "interview_accepted", "offered"];

  const { data: activeApps } = await supabaseAdmin
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .in("status", activeStatuses);

  if (activeApps && activeApps.length > 0) {
    const appIds = activeApps.map((a) => a.id);

    try {
      await supabaseAdmin
        .from("applications")
        .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
        .in("id", appIds);
      summary.applications_withdrawn = appIds.length;
    } catch {}

    // Deactivate masked email pairs for each
    for (const appId of appIds) {
      await deactivateMaskedPair(appId).catch(() => {});
      summary.masked_pairs_deactivated++;
    }
  }

  // 2. Delete video application files
  const { data: allApps } = await supabaseAdmin
    .from("applications")
    .select("id, video_responses")
    .eq("user_id", user.id)
    .not("video_responses", "eq", "[]");

  if (allApps) {
    for (const app of allApps) {
      const vr = app.video_responses as { video_url: string }[] | null;
      if (vr && vr.length > 0) {
        await deleteApplicationVideos(user.id, app.id).catch(() => {});
        summary.videos_deleted += vr.length;
      }
    }

    // Clear video_responses on all applications
    try {
      await supabaseAdmin
        .from("applications")
        .update({ video_responses: [] })
        .eq("user_id", user.id);
    } catch {}
  }

  // 3. Delete resume from storage
  const { data: seekerProfile } = await supabaseAdmin
    .from("seeker_profiles")
    .select("resume_file_url")
    .eq("id", user.id)
    .maybeSingle();

  if (seekerProfile?.resume_file_url) {
    await supabaseAdmin.storage
      .from("resumes")
      .remove([seekerProfile.resume_file_url])
      .then(() => {
        summary.resume_deleted = true;
      })
      .catch(() => {});
  }

  // 4. Anonymize seeker_profiles (clear PII, keep structure for data integrity)
  try {
    await supabaseAdmin
      .from("seeker_profiles")
      .update({
        skills: [],
        years_experience: null,
        location_city: null,
        location_state: null,
        education_level: null,
        education_field: null,
        resume_file_url: null,
        parsed_work_history: [],
        parsed_education: [],
        parsed_certifications: [],
        parsed_summary: null,
        parse_status: "pending",
      })
      .eq("id", user.id);
    summary.profile_anonymized = true;
  } catch {}

  // 5. Mark user_profiles as deleted
  try {
    await supabaseAdmin
      .from("user_profiles")
      .update({ full_name: "[deleted]" })
      .eq("id", user.id);
  } catch {}

  return NextResponse.json({
    ok: true,
    message: "Your data has been deleted. Your account profile has been anonymized. You may now sign out.",
    summary,
  });
});
