import { withApiHandler } from "@/lib/api/withApiHandler";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/applications/[id]/confirm-interview-done
 *
 * Either party confirms the interview has been conducted.
 * For MVP, we advance to Stage 3 on the first confirmation.
 * (Future: require both parties to confirm.)
 *
 * - Validates current status is 'interview_accepted'
 * - Advances disclosure_level to 3
 * - Sets disclosed_at_stage3 timestamp
 * - Creates system message: "Interview confirmed. Full name and resume are now visible."
 */
export const POST = withApiHandler(async function POST(
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

  // Fetch application
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, status, disclosure_level, job_listing_id")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  // Verify caller is either the candidate or the employer on this listing
  let isAuthorized = false;

  if (application.user_id === user.id) {
    isAuthorized = true; // candidate
  } else {
    // Check if caller is an employer on this listing
    const { data: listing } = await supabaseAdmin
      .from("job_listings")
      .select("id, employer_id")
      .eq("id", application.job_listing_id)
      .maybeSingle();

    if (listing) {
      const { data: employerUser } = await supabaseAdmin
        .from("employer_users")
        .select("id")
        .eq("employer_id", listing.employer_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (employerUser) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "You are not a party to this application." },
      { status: 403 }
    );
  }

  if (application.status !== "interview_accepted") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATUS",
        message: `Cannot confirm interview from status "${application.status}". Must be "interview_accepted".`,
      },
      { status: 400 }
    );
  }

  // Already at stage 3? No-op.
  if (application.disclosure_level >= 3) {
    return NextResponse.json({
      ok: true,
      status: application.status,
      disclosure_level: 3,
      message: "Already at Stage 3.",
    });
  }

  // Advance disclosure to Stage 3
  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({
      disclosure_level: 3,
      disclosed_at_stage3: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[confirm-interview-done] Update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to confirm interview." },
      { status: 500 }
    );
  }

  await createSystemMessage(
    id,
    "Interview confirmed. Full name and resume are now visible to the employer.",
    "status_change",
    { action: "interview_confirmed", disclosure_level: 3 }
  );

  return NextResponse.json({
    ok: true,
    status: "interview_accepted",
    disclosure_level: 3,
  });
});
