import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { z } from "zod";

const moderateSchema = z.object({
  action: z.enum(["approved", "changes_requested", "rejected"]),
  notes: z.string().max(2000).optional(),
  rejection_category: z
    .enum([
      "violates_terms",
      "suspected_scam",
      "prohibited_content",
      "duplicate_deal",
      "insufficient_detail",
      "other",
    ])
    .optional(),
});

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const adminCheck = await verifyAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const { id } = await params;
    const body = await req.json();
    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 }
      );
    }

    const { action, notes, rejection_category } = parsed.data;
    const serviceClient = createServiceClient();

    // Fetch the deal
    const { data: deal, error: dealError } = await serviceClient
      .from("deals")
      .select("id, title, review_status, status, escrow_status, client_user_id, freelancer_user_id, deal_link_slug, total_amount, submitted_at")
      .eq("id", id)
      .maybeSingle();

    if (dealError || !deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    const previousStatus = deal.review_status;

    // Build the review notes
    let fullNotes = notes || "";
    if (action === "rejected" && rejection_category) {
      const categoryLabels: Record<string, string> = {
        violates_terms: "Violates Terms of Service",
        suspected_scam: "Suspected Scam",
        prohibited_content: "Prohibited Content",
        duplicate_deal: "Duplicate Gig",
        insufficient_detail: "Insufficient Detail",
        other: "Other",
      };
      fullNotes = `[${categoryLabels[rejection_category]}] ${fullNotes}`.trim();
    }

    // ── Apply the moderation action ──
    const updatePayload: Record<string, unknown> = {
      review_status: action,
      review_notes: fullNotes || null,
      reviewed_by: adminCheck.userId,
      reviewed_at: new Date().toISOString(),
      flagged_for_review: action !== "approved",
    };

    // If approving a deal that has been submitted but auto_release_at was null
    // (because it was submitted while under review), start the 72-hour countdown now
    if (action === "approved" && deal.status === "submitted" && deal.submitted_at) {
      updatePayload.auto_release_at = new Date(
        Date.now() + 72 * 60 * 60 * 1000
      ).toISOString();
    }

    // If rejecting and funds are in escrow, mark for refund
    // (Actual Stripe refund is handled by a separate admin action or webhook)
    if (action === "rejected" && deal.escrow_status === "funded") {
      updatePayload.escrow_status = "frozen";
      updatePayload.flagged_reason = `Rejected: ${fullNotes}`;
    }

    const { error: updateError } = await serviceClient
      .from("deals")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: updateError.message },
        { status: 500 }
      );
    }

    // ── Log the moderation action ──
    await serviceClient.from("deal_moderation_log").insert({
      deal_id: id,
      admin_user_id: adminCheck.userId,
      action,
      previous_status: previousStatus,
      new_status: action,
      notes: fullNotes || null,
    });

    // ── Activity log entry (visible to deal participants) ──
    const systemMessages: Record<string, string> = {
      approved: "This gig has been verified by CheckHire.",
      changes_requested: `CheckHire has requested changes to this gig: ${fullNotes}`,
      rejected: "This gig has been removed by CheckHire for violating our terms.",
    };

    await serviceClient.from("deal_activity_log").insert({
      deal_id: id,
      user_id: null,
      entry_type: "system",
      content: systemMessages[action],
    });

    return NextResponse.json({
      ok: true,
      action,
      deal_id: id,
      previous_status: previousStatus,
      new_status: action,
    });
  }
);
