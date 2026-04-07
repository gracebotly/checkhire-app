import type { SupabaseClient } from "@supabase/supabase-js";

type EscalateParams = {
  serviceClient: SupabaseClient;
  cancellationRequestId: string;
  dealId: string;
  // Who triggered the escalation. For auto-escalation, pass null + isAutomatic: true
  triggeredByUserId: string | null;
  isAutomatic: boolean;
  // Dispute fields. For automatic escalation these are auto-generated.
  disputeCategory?: string;
  disputeReason?: string;
  disputeProposedPercentage?: number;
  disputeJustification?: string;
};

type EscalateResult =
  | { ok: true; disputeId: string }
  | { ok: false; error: string };

const AUTO_DISPUTE_CATEGORY = "other";
const AUTO_DISPUTE_REASON =
  "This dispute was automatically opened because a mutual cancellation request was not responded to within 72 hours. Both parties should now provide evidence and propose a fair resolution.";
const AUTO_DISPUTE_JUSTIFICATION =
  "Auto-generated from an unresponded mutual cancellation request. Original requester proposed a split that the other party did not accept, reject, or counter within the response window.";

export async function escalateCancellationRequestToDispute(
  params: EscalateParams
): Promise<EscalateResult> {
  const {
    serviceClient,
    cancellationRequestId,
    dealId,
    triggeredByUserId,
    isAutomatic,
    disputeCategory,
    disputeReason,
    disputeProposedPercentage,
    disputeJustification,
  } = params;

  // Fetch the cancellation request
  const { data: cancelReq } = await serviceClient
    .from("cancellation_requests")
    .select("*")
    .eq("id", cancellationRequestId)
    .maybeSingle();

  if (!cancelReq) return { ok: false, error: "Cancellation request not found" };
  if (cancelReq.status !== "pending")
    return { ok: false, error: "Cancellation request is not pending" };

  // Fetch the deal
  const { data: deal } = await serviceClient
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .maybeSingle();

  if (!deal) return { ok: false, error: "Deal not found" };

  // Check that there isn't already an open dispute (defensive)
  const { data: existingDispute } = await serviceClient
    .from("disputes")
    .select("id")
    .eq("deal_id", dealId)
    .in("status", ["open", "under_review"])
    .maybeSingle();

  if (existingDispute) return { ok: false, error: "A dispute is already open" };

  const now = new Date();
  const deadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  // Compute proposed_percentage as the freelancer's share of the original split
  // (matches dispute system semantics where proposed_percentage = freelancer's share)
  const totalSplit =
    cancelReq.proposed_client_refund_cents +
    cancelReq.proposed_freelancer_payout_cents;
  const computedPercentage =
    totalSplit > 0
      ? Math.round((cancelReq.proposed_freelancer_payout_cents / totalSplit) * 100)
      : 0;

  const finalCategory = isAutomatic
    ? AUTO_DISPUTE_CATEGORY
    : disputeCategory || AUTO_DISPUTE_CATEGORY;
  const finalReason = isAutomatic
    ? AUTO_DISPUTE_REASON
    : disputeReason || AUTO_DISPUTE_REASON;
  const finalPercentage = isAutomatic
    ? computedPercentage
    : disputeProposedPercentage ?? computedPercentage;
  const finalJustification = isAutomatic
    ? AUTO_DISPUTE_JUSTIFICATION
    : disputeJustification || AUTO_DISPUTE_JUSTIFICATION;

  // Freeze deal + null out auto_release_at (mirrors dispute route)
  await serviceClient
    .from("deals")
    .update({
      status: "disputed",
      escrow_status: "frozen",
      auto_release_at: null,
    })
    .eq("id", dealId);

  if (deal.has_milestones) {
    await serviceClient
      .from("milestones")
      .update({ auto_release_at: null })
      .eq("deal_id", dealId)
      .not("auto_release_at", "is", null);
  }

  // Create the dispute
  const { data: dispute, error: disputeError } = await serviceClient
    .from("disputes")
    .insert({
      deal_id: dealId,
      initiated_by: triggeredByUserId || cancelReq.requested_by,
      reason: finalReason,
      status: "open",
      category: finalCategory,
      claimant_proposed_percentage: finalPercentage,
      claimant_justification: finalJustification,
      evidence_deadline_at: deadlineAt,
      response_deadline_at: deadlineAt,
    })
    .select()
    .single();

  if (disputeError || !dispute) {
    return { ok: false, error: disputeError?.message || "Failed to create dispute" };
  }

  // Mark the cancellation request as escalated and link to the dispute
  await serviceClient
    .from("cancellation_requests")
    .update({
      status: "escalated",
      escalated_dispute_id: dispute.id,
      responded_by: triggeredByUserId,
      responded_at: new Date().toISOString(),
    })
    .eq("id", cancellationRequestId);

  return { ok: true, disputeId: dispute.id };
}
