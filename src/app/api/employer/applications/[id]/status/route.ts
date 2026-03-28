import { withApiHandler } from "@/lib/api/withApiHandler";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { logCandidateAccess } from "@/lib/api/auditLog";
import { checkCandidateViewRateLimit } from "@/lib/api/rateLimitCandidateViews";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewed", "shortlisted", "rejected"],
  reviewed: ["shortlisted", "interview_requested", "rejected"],
  shortlisted: ["interview_requested", "rejected"],
  interview_requested: ["interview_accepted", "rejected"],
  interview_accepted: ["offered", "rejected"],
  offered: ["hired", "rejected"],
};

/**
 * PATCH /api/employer/applications/[id]/status
 *
 * Body: { status: string }
 *
 * Updates application status. Validates the transition is allowed.
 * Rate limited and audit logged.
 */
export const PATCH = withApiHandler(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Rate limit check
  const rl = await checkCandidateViewRateLimit(ctx.employerId, req);
  if (!rl.allowed) return rl.response;

  const body = await req.json().catch(() => ({}));
  const newStatus = body.status as string;

  if (!newStatus) {
    return NextResponse.json(
      { ok: false, code: "MISSING_STATUS", message: "status is required." },
      { status: 400 }
    );
  }

  // Fetch application and verify ownership
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, status, job_listing_id, disclosure_level")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  const { data: listing } = await supabaseAdmin
    .from("job_listings")
    .select("id, employer_id")
    .eq("id", application.job_listing_id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_AUTHORIZED",
        message: "This application is not on your listing.",
      },
      { status: 403 }
    );
  }

  // Validate status transition
  const allowed = VALID_TRANSITIONS[application.status];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot transition from "${application.status}" to "${newStatus}".`,
      },
      { status: 400 }
    );
  }

  // Update status
  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({ status: newStatus })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to update status." },
      { status: 500 }
    );
  }

  // Log access using centralized utility
  await logCandidateAccess(
    ctx.employerId,
    ctx.userId,
    "stage_advance",
    id,
    application.disclosure_level,
    req
  );

  return NextResponse.json({ ok: true, status: newStatus });
});
