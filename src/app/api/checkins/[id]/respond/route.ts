import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { recalculateScore } from "@/lib/employer/recalculateScore";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/checkins/[id]/respond
 *
 * Body: { heard_back: boolean, job_was_real: boolean, got_paid?: boolean, rating: 1-5, comments?: string }
 *
 * Worker submits their post-hire check-in response.
 * Creates an employer_reviews row and triggers score recalculation.
 * If got_paid=false or job_was_real=false, auto-creates a flag.
 */
export const POST = withApiHandler(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: checkinId } = await params;

  // Authenticate
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

  // Fetch the check-in and verify ownership
  const { data: checkin } = await supabaseAdmin
    .from("post_hire_checkins")
    .select("id, application_id, employer_id, user_id, checkin_type, status")
    .eq("id", checkinId)
    .single();

  if (!checkin) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Check-in not found." },
      { status: 404 }
    );
  }

  if (checkin.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "This check-in is not yours." },
      { status: 403 }
    );
  }

  if (checkin.status === "responded") {
    return NextResponse.json(
      { ok: false, code: "ALREADY_RESPONDED", message: "You already responded to this check-in." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Validate
  const heardBack = typeof body.heard_back === "boolean" ? body.heard_back : null;
  const jobWasReal = typeof body.job_was_real === "boolean" ? body.job_was_real : null;
  const gotPaid = typeof body.got_paid === "boolean" ? body.got_paid : null;
  const rating = typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5
    ? Math.round(body.rating)
    : null;
  const comments = typeof body.comments === "string" ? body.comments.trim().slice(0, 2000) : null;

  if (heardBack === null || jobWasReal === null || rating === null) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "heard_back (boolean), job_was_real (boolean), and rating (1-5) are required.",
      },
      { status: 400 }
    );
  }

  // Get the listing ID for the review
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("job_listing_id")
    .eq("id", checkin.application_id)
    .single();

  // Update the check-in
  const responseData = { heard_back: heardBack, job_was_real: jobWasReal, got_paid: gotPaid, rating, comments };

  const { error: checkinError } = await supabaseAdmin
    .from("post_hire_checkins")
    .update({
      status: "responded",
      responded_at: new Date().toISOString(),
      response_data: responseData,
    })
    .eq("id", checkinId);

  if (checkinError) {
    console.error("[checkins/respond] Update error:", checkinError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to save response." },
      { status: 500 }
    );
  }

  // Create employer review
  const reviewType = checkin.checkin_type === "30day" ? "post_hire_30day" : "post_hire_60day";

  const { error: reviewError } = await supabaseAdmin
    .from("employer_reviews")
    .insert({
      employer_id: checkin.employer_id,
      job_listing_id: application?.job_listing_id ?? null,
      user_id: user.id,
      heard_back: heardBack,
      job_was_real: jobWasReal,
      got_paid: gotPaid,
      rating,
      comments,
      review_type: reviewType,
    });

  if (reviewError) {
    console.error("[checkins/respond] Review insert error:", reviewError.message);
    // Don't fail the request — the check-in was saved
  }

  // Auto-flag if negative responses
  if (jobWasReal === false || gotPaid === false) {
    const flagReason = gotPaid === false ? "ghost_job" : "bait_and_switch";
    const flagDescription = gotPaid === false
      ? "Worker reported not being paid after hire (post-hire check-in)."
      : "Worker reported the job was not as described (post-hire check-in).";

    await supabaseAdmin
      .from("flags")
      .insert({
        reporter_id: user.id,
        reporter_type: "applicant",
        target_type: "employer",
        target_id: checkin.employer_id,
        reason: flagReason,
        description: flagDescription,
        severity_weight: 3, // high severity — worker harmed
      })
      .then(({ error }) => {
        if (error) console.error("[checkins/respond] Auto-flag error:", error.message);
      });
  }

  // Recalculate employer transparency score (non-blocking)
  recalculateScore(checkin.employer_id).catch(() => {});

  return NextResponse.json({
    ok: true,
    message: "Thank you for your feedback. Your response helps keep CheckHire trustworthy.",
  });
});
