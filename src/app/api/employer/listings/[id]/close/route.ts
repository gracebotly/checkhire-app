import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

  return NextResponse.json({
    ok: true,
    status: newStatus,
    close_reason: finalReason,
    close_reason_label: CLOSE_REASON_LABELS[closeReason] || closeReason,
  });
});

// Export the valid reasons so the frontend can use them
export { VALID_CLOSE_REASONS, CLOSE_REASON_LABELS };
