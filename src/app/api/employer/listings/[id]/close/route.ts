import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { deactivateAllPairsForListing } from "@/lib/email/maskedEmail";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { scheduleAllCheckins } from "@/lib/email/postHireCheckin";
import { recalculateScore } from "@/lib/employer/recalculateScore";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_CLOSE_REASONS = [
  "filled",
  "budget_cut",
  "role_eliminated",
  "hired_internally",
  "position_restructured",
  "insufficient_candidates",
  "other",
] as const;

const CLOSE_REASON_LABELS: Record<string, string> = {
  filled: "Position filled",
  budget_cut: "Budget cut",
  role_eliminated: "Role eliminated",
  hired_internally: "Hired internally",
  position_restructured: "Position restructured",
  insufficient_candidates: "Insufficient qualified candidates",
  other: "Other",
};

/**
 * POST /api/employer/listings/[id]/close
 *
 * Mandatory close-out flow. Requires { close_reason, status }.
 * status must be "closed" or "filled".
 * close_reason must be one of the VALID_CLOSE_REASONS.
 * If "other", an optional close_reason_detail can be provided.
 */
export const POST = withApiHandler(async function POST(
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

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("job_listings")
    .select("id, status")
    .eq("id", id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Listing not found." },
      { status: 404 }
    );
  }

  // Can only close active or paused listings
  if (!["active", "paused", "expired"].includes(existing.status)) {
    return NextResponse.json(
      {
        ok: false,
        code: "ALREADY_CLOSED",
        message: "This listing is already closed.",
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const closeReason = (body?.close_reason ?? "").toString();
  const newStatus = (body?.status ?? "closed").toString();
  const closeReasonDetail = (body?.close_reason_detail ?? "").toString().trim();

  if (!["closed", "filled"].includes(newStatus)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATUS",
        message: "Status must be 'closed' or 'filled'.",
      },
      { status: 400 }
    );
  }

  if (
    !VALID_CLOSE_REASONS.includes(
      closeReason as (typeof VALID_CLOSE_REASONS)[number]
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REASON",
        message: "Please select a valid close reason.",
        valid_reasons: VALID_CLOSE_REASONS,
      },
      { status: 400 }
    );
  }

  const finalReason =
    closeReason === "other" && closeReasonDetail
      ? `other: ${closeReasonDetail}`
      : closeReason;

  const { error } = await supabaseAdmin
    .from("job_listings")
    .update({
      status: newStatus,
      close_reason: finalReason,
    })
    .eq("id", id)
    .eq("employer_id", ctx.employerId);

  if (error) {
    console.error("[api/employer/listings/id/close] Error:", error.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to close listing." },
      { status: 500 }
    );
  }

  // Deactivate all masked email pairs for this listing (non-blocking)
  const deactivatedCount = await deactivateAllPairsForListing(id).catch(() => 0);

  // Batch notify all open candidates that the listing is closed
  const hiredCandidateId = body?.hired_candidate_id || null;
  const reasonLabel = CLOSE_REASON_LABELS[closeReason] || closeReason;

  const { data: openApps } = await supabaseAdmin
    .from("applications")
    .select("id, status")
    .eq("job_listing_id", id)
    .not("status", "in", "(rejected,hired,withdrawn)");

  if (openApps && openApps.length > 0) {
    // If filled, mark the hired candidate
    if (newStatus === "filled" && hiredCandidateId) {
      await supabaseAdmin
        .from("applications")
        .update({ status: "hired", hired_at: new Date().toISOString() })
        .eq("id", hiredCandidateId)
        .eq("job_listing_id", id);

      await createSystemMessage(
        hiredCandidateId,
        "Congratulations! You've been hired for this position.",
        "status_change",
        { action: "hired", close_reason: finalReason }
      ).catch(() => {});

      // Schedule post-hire check-ins (non-blocking)
      const { data: hiredApp } = await supabaseAdmin
        .from("applications")
        .select("user_id")
        .eq("id", hiredCandidateId)
        .single();

      if (hiredApp?.user_id) {
        scheduleAllCheckins(hiredCandidateId, ctx.employerId, hiredApp.user_id).catch(
          (err) => console.error("[close] Check-in scheduling error:", err)
        );
      }
    }

    // Notify all other open candidates
    for (const app of openApps) {
      if (app.id === hiredCandidateId) continue;

      await supabaseAdmin
        .from("applications")
        .update({ status: "rejected" })
        .eq("id", app.id);

      await createSystemMessage(
        app.id,
        `This position has been closed. Reason: ${reasonLabel}. Thank you for your interest.`,
        "status_change",
        { action: "listing_closed", close_reason: finalReason }
      ).catch(() => {});
    }
  }

  // Recalculate transparency score (non-blocking)
  recalculateScore(ctx.employerId).catch(() => {});

  return NextResponse.json({
    ok: true,
    status: newStatus,
    close_reason: finalReason,
    close_reason_label: reasonLabel,
    masked_pairs_deactivated: deactivatedCount,
    candidates_notified: openApps?.length || 0,
    hired_candidate_id: hiredCandidateId,
  });
});

// Export the valid reasons so the frontend can use them
export { VALID_CLOSE_REASONS, CLOSE_REASON_LABELS };
