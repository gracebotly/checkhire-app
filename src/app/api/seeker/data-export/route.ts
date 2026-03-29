import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/seeker/data-export
 */
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

  // Verify user is a job seeker
  const { data: userProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name, user_type, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!userProfile || userProfile.user_type !== "job_seeker") {
    return NextResponse.json(
      { ok: false, code: "NOT_SEEKER", message: "Only job seekers can export data." },
      { status: 403 }
    );
  }

  // Fetch seeker profile
  const { data: seekerProfile } = await supabaseAdmin
    .from("seeker_profiles")
    .select("skills, years_experience, location_city, location_state, education_level, education_field, parsed_work_history, parsed_education, parsed_certifications, parsed_summary, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch all applications
  const { data: applications } = await supabaseAdmin
    .from("applications")
    .select(`
      id, pseudonym, disclosure_level, status, screening_responses,
      screening_score, created_at, withdrawn_at,
      disclosed_at_stage2, disclosed_at_stage3,
      job_listings (
        title, slug, job_type, pay_type, remote_type, status,
        employers ( company_name )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch all messages sent BY the candidate (not employer messages)
  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("id, application_id, message_text, message_type, created_at")
    .eq("sender_id", user.id)
    .eq("sender_type", "candidate")
    .order("created_at", { ascending: true });

  // Build export object
  const exportData = {
    export_date: new Date().toISOString(),
    platform: "CheckHire",
    data_retention_policy: {
      resumes: "Deleted 90 days after listing closes or on your request",
      video_applications: "Deleted 90 days after listing closes",
      application_records: "Anonymized 1 year after listing closes",
      chat_messages: "Deleted 1 year after last message",
    },
    account: {
      email: user.email,
      full_name: userProfile.full_name,
      user_type: userProfile.user_type,
      created_at: userProfile.created_at,
    },
    profile: seekerProfile || null,
    applications: (applications || []).map((app) => {
      const listing = Array.isArray(app.job_listings)
        ? app.job_listings[0]
        : app.job_listings;
      const employer = listing
        ? Array.isArray((listing as Record<string, unknown>).employers)
          ? ((listing as Record<string, unknown>).employers as Record<string, unknown>[])[0]
          : (listing as Record<string, unknown>).employers
        : null;

      return {
        id: app.id,
        pseudonym: app.pseudonym,
        status: app.status,
        screening_score: app.screening_score,
        screening_responses: app.screening_responses,
        disclosure_level: app.disclosure_level,
        applied_at: app.created_at,
        withdrawn_at: app.withdrawn_at,
        disclosed_at_stage2: app.disclosed_at_stage2,
        disclosed_at_stage3: app.disclosed_at_stage3,
        listing: listing
          ? {
              title: (listing as Record<string, unknown>).title,
              job_type: (listing as Record<string, unknown>).job_type,
              company: employer
                ? (employer as Record<string, unknown>).company_name
                : null,
            }
          : null,
      };
    }),
    messages_sent: (messages || []).map((m) => ({
      id: m.id,
      application_id: m.application_id,
      message_text: m.message_text,
      message_type: m.message_type,
      sent_at: m.created_at,
    })),
    total_applications: applications?.length || 0,
    total_messages_sent: messages?.length || 0,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="checkhire-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
});
