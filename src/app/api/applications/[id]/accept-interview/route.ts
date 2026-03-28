import { withApiHandler } from "@/lib/api/withApiHandler";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendInterviewNotification } from "@/lib/email/interviewNotification";
import { activateMaskedPair } from "@/lib/email/maskedEmail";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/applications/[id]/accept-interview
 *
 * Candidate accepts an interview request.
 * - Validates current status is 'interview_requested'
 * - Sets status to 'interview_accepted'
 * - Advances disclosure_level to 2
 * - Sets disclosed_at_stage2 timestamp
 * - Creates system message: "Interview accepted. First name is now visible to the employer."
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

  // Fetch application — candidate must own it
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, status, disclosure_level, job_listing_id, pseudonym")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  if (application.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "This is not your application." },
      { status: 403 }
    );
  }

  if (application.status !== "interview_requested") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATUS",
        message: `Cannot accept interview from status "${application.status}". Must be "interview_requested".`,
      },
      { status: 400 }
    );
  }

  // Advance status + disclosure level
  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({
      status: "interview_accepted",
      disclosure_level: 2,
      disclosed_at_stage2: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[accept-interview] Update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to accept interview." },
      { status: 500 }
    );
  }

  // Create system message
  await createSystemMessage(
    id,
    "Interview accepted. Your first name is now visible to the employer.",
    "interview_response",
    { action: "accepted", disclosure_level: 2 }
  );

  // Activate masked email relay for this application
  const { data: listingForPair } = await supabaseAdmin
    .from("job_listings")
    .select("employer_id")
    .eq("id", application.job_listing_id)
    .maybeSingle();

  let maskedPair = null;
  if (listingForPair) {
    maskedPair = await activateMaskedPair(id, listingForPair.employer_id, user.id);
    if (maskedPair) {
      await createSystemMessage(
        id,
        `Masked email relay activated. The employer can now email you via ${maskedPair.applicant_masked_email} — your real email stays hidden.`,
        "system",
        { masked_email_activated: true }
      );
    }
  }

  // Notify employer that candidate accepted (non-blocking)
  (async () => {
    try {
      // Get listing + employer info
      const { data: listing } = await supabaseAdmin
        .from("job_listings")
        .select("title, employer_id, employers(company_name, claimed_by)")
        .eq("id", application.job_listing_id)
        .maybeSingle();

      const listingData = listing as { title: string; employer_id: string; employers: { company_name: string; claimed_by: string | null } | { company_name: string; claimed_by: string | null }[] } | null;
      const employer = listingData?.employers;
      const employerInfo = Array.isArray(employer) ? employer[0] : employer;

      if (employerInfo?.claimed_by) {
        const { data: employerAuth } = await supabaseAdmin.auth.admin.getUserById(employerInfo.claimed_by);
        if (employerAuth?.user?.email) {
          // Get candidate first name for the notification
          const { data: userProfile } = await supabaseAdmin
            .from("user_profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

          const firstName = userProfile?.full_name?.split(" ")[0] || application.pseudonym;

          await sendInterviewNotification({
            to: employerAuth.user.email,
            recipientName: null,
            listingTitle: listingData?.title || "a job listing",
            companyName: employerInfo.company_name || "your company",
            candidateLabel: firstName,
            eventType: "interview_accepted",
            applicationId: id,
          });
        }
      }
    } catch (err) {
      console.error("[accept-interview] Notification error:", err);
    }
  })();

  return NextResponse.json({
    ok: true,
    status: "interview_accepted",
    disclosure_level: 2,
    masked_email: maskedPair
      ? {
          applicant_masked: maskedPair.applicant_masked_email,
          employer_masked: maskedPair.employer_masked_email,
        }
      : null,
  });
});
