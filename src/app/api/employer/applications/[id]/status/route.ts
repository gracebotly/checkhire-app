import { withApiHandler } from "@/lib/api/withApiHandler";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { logCandidateAccess } from "@/lib/api/auditLog";
import { checkCandidateViewRateLimit } from "@/lib/api/rateLimitCandidateViews";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendInterviewNotification } from "@/lib/email/interviewNotification";
import { deactivateMaskedPair } from "@/lib/email/maskedEmail";
import { scheduleAllCheckins } from "@/lib/email/postHireCheckin";
import { recalculateScore } from "@/lib/employer/recalculateScore";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Employer-allowed status transitions.
 * Note: interview_accepted is NOT here — only the CANDIDATE can set that.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewed", "shortlisted", "rejected"],
  reviewed: ["shortlisted", "interview_requested", "rejected"],
  shortlisted: ["interview_requested", "rejected"],
  interview_requested: ["rejected"], // employer can only reject; candidate accepts/declines
  interview_accepted: ["offered", "rejected"],
  offered: ["hired", "rejected"],
};

const STATUS_SYSTEM_MESSAGES: Record<string, string> = {
  reviewed: "Application has been reviewed by the employer.",
  shortlisted: "You've been shortlisted! The employer is interested in your profile.",
  interview_requested:
    "The employer would like to schedule an interview with you. Please accept or decline.",
  rejected: "The employer has decided not to move forward with your application.",
  offered: "Congratulations! The employer has extended an offer.",
  hired: "You've been hired! Welcome aboard.",
};

/**
 * PATCH /api/employer/applications/[id]/status
 *
 * Body: { status: string }
 *
 * Updates application status. Validates the transition is allowed.
 * Creates a system message in the chat thread.
 * Rate limited and audit logged.
 *
 * IMPORTANT: This route does NOT advance disclosure_level.
 * Disclosure only advances when the CANDIDATE takes action:
 * - Accept interview → disclosure_level 2 (via /api/applications/[id]/accept-interview)
 * - Confirm interview done → disclosure_level 3 (via /api/applications/[id]/confirm-interview-done)
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
    .select("id, status, job_listing_id, disclosure_level, pseudonym")
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
    .select("id, employer_id, title")
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

  // Build update payload — add hired_at timestamp when transitioning to 'hired'
  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === "hired") {
    updatePayload.hired_at = new Date().toISOString();
  }

  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to update status." },
      { status: 500 }
    );
  }

  // Deactivate masked email pair on rejection (non-blocking)
  if (newStatus === "rejected") {
    deactivateMaskedPair(id).catch((err) => {
      console.error("[status] Masked pair deactivation error:", err);
    });
  }

  // Create system message in chat
  const systemText = STATUS_SYSTEM_MESSAGES[newStatus];
  if (systemText) {
    const messageType = newStatus === "interview_requested" ? "interview_request" : "status_change";
    await createSystemMessage(id, systemText, messageType, {
      from_status: application.status,
      to_status: newStatus,
      employer_company: ctx.employer.company_name,
      listing_title: listing.title,
    });
  }

  // Send email notification for interview requests (non-blocking)
  if (newStatus === "interview_requested") {
    (async () => {
      try {
        const { data: candidateAuth } = await supabaseAdmin.auth.admin.getUserById(
          // We need the candidate's user_id from the application
          (await supabaseAdmin.from("applications").select("user_id").eq("id", id).single()).data?.user_id || ""
        );
        if (candidateAuth?.user?.email) {
          await sendInterviewNotification({
            to: candidateAuth.user.email,
            recipientName: null,
            listingTitle: listing.title,
            companyName: ctx.employer.company_name,
            candidateLabel: application.pseudonym,
            eventType: "interview_requested",
            applicationId: id,
          });
        }
      } catch (err) {
        console.error("[status] Interview notification error:", err);
      }
    })();
  }

  // Schedule post-hire check-ins when hired (non-blocking)
  if (newStatus === "hired") {
    const { data: hiredApp } = await supabaseAdmin
      .from("applications")
      .select("user_id")
      .eq("id", id)
      .single();

    if (hiredApp?.user_id) {
      scheduleAllCheckins(id, ctx.employerId, hiredApp.user_id).catch((err) =>
        console.error("[status] Check-in scheduling error:", err)
      );
    }

    // Recalculate transparency score
    recalculateScore(ctx.employerId).catch(() => {});
  }

  // Log access
  const actionType = newStatus === "interview_requested" ? "interview_request" : "stage_advance";
  await logCandidateAccess(
    ctx.employerId,
    ctx.userId,
    actionType,
    id,
    application.disclosure_level,
    req
  );

  const response = NextResponse.json({ ok: true, status: newStatus });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
});
