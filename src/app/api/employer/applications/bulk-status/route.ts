import { withApiHandler } from "@/lib/api/withApiHandler";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { logCandidateAccess } from "@/lib/api/auditLog";
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
  interview_requested: ["rejected"],
  interview_accepted: ["offered", "rejected"],
  offered: ["hired", "rejected"],
};

const STATUS_SYSTEM_MESSAGES: Record<string, string> = {
  shortlisted: "You've been shortlisted! The employer is interested in your profile.",
  rejected: "The employer has decided not to move forward with your application.",
};

/**
 * PATCH /api/employer/applications/bulk-status
 *
 * Body: {
 *   application_ids: string[],
 *   status: string,
 *   rejection_message?: string  // Custom message for rejections
 * }
 *
 * Updates multiple application statuses in a single request.
 * Validates each transition individually. Sends system messages.
 * Max 50 applications per request.
 */
export const PATCH = withApiHandler(async function PATCH(req: Request) {
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { application_ids, status: newStatus, rejection_message } = body;

  if (!Array.isArray(application_ids) || application_ids.length === 0) {
    return NextResponse.json(
      { ok: false, code: "MISSING_IDS", message: "application_ids array required." },
      { status: 400 }
    );
  }

  if (application_ids.length > 50) {
    return NextResponse.json(
      { ok: false, code: "TOO_MANY", message: "Maximum 50 applications per bulk action." },
      { status: 400 }
    );
  }

  if (!newStatus || typeof newStatus !== "string") {
    return NextResponse.json(
      { ok: false, code: "MISSING_STATUS", message: "status is required." },
      { status: 400 }
    );
  }

  // Fetch all applications and verify ownership
  const { data: applications } = await supabaseAdmin
    .from("applications")
    .select("id, status, job_listing_id, pseudonym")
    .in("id", application_ids);

  if (!applications || applications.length === 0) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "No applications found." },
      { status: 404 }
    );
  }

  // Verify all listings belong to this employer
  const listingIds = [...new Set(applications.map((a) => a.job_listing_id))];
  const { data: listings } = await supabaseAdmin
    .from("job_listings")
    .select("id")
    .in("id", listingIds)
    .eq("employer_id", ctx.employerId);

  const ownedListingIds = new Set((listings || []).map((l) => l.id));

  let updated = 0;
  let failed = 0;

  for (const app of applications) {
    // Check ownership
    if (!ownedListingIds.has(app.job_listing_id)) {
      failed++;
      continue;
    }

    // Check valid transition
    const allowed = VALID_TRANSITIONS[app.status];
    if (!allowed || !allowed.includes(newStatus)) {
      failed++;
      continue;
    }

    // Update status
    const { error } = await supabaseAdmin
      .from("applications")
      .update({ status: newStatus })
      .eq("id", app.id);

    if (error) {
      failed++;
      continue;
    }

    // Send system message
    const systemText =
      newStatus === "rejected" && rejection_message
        ? rejection_message
        : STATUS_SYSTEM_MESSAGES[newStatus] || `Your application status has been updated to ${newStatus.replace(/_/g, " ")}.`;

    await createSystemMessage(app.id, systemText, "status_change", {
      from_status: app.status,
      to_status: newStatus,
      bulk_action: true,
    }).catch(() => {});

    // Log access
    await logCandidateAccess(
      ctx.employerId,
      ctx.userId,
      "stage_advance",
      app.id,
      1,
      req
    ).catch(() => {});

    updated++;
  }

  return NextResponse.json({ ok: true, updated, failed });
});
