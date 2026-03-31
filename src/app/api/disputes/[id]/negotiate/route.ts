import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { disputeNegotiateSchema } from "@/lib/validation/disputes";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { verifyGuestToken } from "@/lib/deals/guestToken";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();

    const parsed = disputeNegotiateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );

    const { proposed_percentage, guest_token } = parsed.data;
    const serviceClient = createServiceClient();

    // Fetch dispute + deal
    const { data: dispute } = await serviceClient
      .from("disputes")
      .select("*, deal:deals!inner(*)")
      .eq("id", id)
      .maybeSingle();

    if (!dispute)
      return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Dispute not found" }, { status: 404 });

    const deal = dispute.deal as Record<string, unknown>;

    // Auth
    let userId: string | null = null;
    let isGuest = false;

    if (guest_token) {
      const guestEmail = deal.guest_freelancer_email as string | null;
      if (guestEmail && verifyGuestToken(guest_token, deal.id as string, guestEmail)) {
        isGuest = true;
      }
    }

    if (!isGuest) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user)
        return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
      userId = user.id;
    }

    // Verify participant
    const isClient = userId === deal.client_user_id;
    const isFreelancer = userId === deal.freelancer_user_id;
    const isGuestFreelancer = isGuest;

    if (!isClient && !isFreelancer && !isGuestFreelancer)
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not a participant" }, { status: 403 });

    // Verify negotiation_round = 1
    if (dispute.negotiation_round !== 1)
      return NextResponse.json(
        { ok: false, code: "INVALID_STATUS", message: "Negotiation round is not active" },
        { status: 400 }
      );

    // Determine if this is the claimant or respondent
    const isClaimant = (userId && dispute.initiated_by === userId) || (isGuest && dispute.initiated_by === "guest");

    if (isClaimant) {
      if (dispute.claimant_round2_percentage !== null)
        return NextResponse.json({ ok: false, code: "ALREADY_SUBMITTED", message: "You already submitted your round 2 proposal." }, { status: 400 });
      await serviceClient.from("disputes").update({ claimant_round2_percentage: proposed_percentage }).eq("id", id);
    } else {
      if (dispute.respondent_round2_percentage !== null)
        return NextResponse.json({ ok: false, code: "ALREADY_SUBMITTED", message: "You already submitted your round 2 proposal." }, { status: 400 });
      await serviceClient.from("disputes").update({ respondent_round2_percentage: proposed_percentage }).eq("id", id);
    }

    // Refetch dispute to check if both round 2 proposals exist
    const { data: updated } = await serviceClient.from("disputes").select("*").eq("id", id).maybeSingle();
    if (!updated) return NextResponse.json({ ok: false, code: "DB_ERROR", message: "Failed to fetch dispute" }, { status: 500 });

    const dealId = deal.id as string;
    const dealTitle = deal.title as string;
    const dealSlug = deal.deal_link_slug as string;
    const totalAmount = deal.total_amount as number;
    const clientUserId = deal.client_user_id as string;
    const freelancerUserId = deal.freelancer_user_id as string | null;
    const guestEmail = deal.guest_freelancer_email as string | null;

    if (updated.claimant_round2_percentage !== null && updated.respondent_round2_percentage !== null) {
      // Both submitted — check overlap
      const claimantIsClient = dispute.initiated_by === clientUserId;

      let clientOffer: number;
      let freelancerAsk: number;

      if (claimantIsClient) {
        clientOffer = updated.claimant_round2_percentage;
        freelancerAsk = updated.respondent_round2_percentage;
      } else {
        freelancerAsk = updated.claimant_round2_percentage;
        clientOffer = updated.respondent_round2_percentage;
      }

      if (clientOffer >= freelancerAsk) {
        // Auto-resolve at freelancer's ask
        const resolvedPercentage = freelancerAsk;
        const resolutionAmount = Math.round(totalAmount * resolvedPercentage / 100);

        await serviceClient.from("disputes").update({
          auto_resolved: true,
          status: "resolved_partial",
          negotiation_round: 2,
          resolution_amount: resolutionAmount,
          resolution_notes: `Auto-resolved in round 2: ${resolvedPercentage}% to freelancer`,
          resolved_at: new Date().toISOString(),
        }).eq("id", id);

        // Email both
        const { data: cp } = await serviceClient.from("user_profiles").select("email").eq("id", clientUserId).maybeSingle();
        if (cp?.email) await sendAndLogNotification({ supabase: serviceClient, type: "dispute_auto_resolved", userId: clientUserId, dealId, email: cp.email, data: { dealTitle, dealSlug } });
        if (freelancerUserId) {
          const { data: fp } = await serviceClient.from("user_profiles").select("email").eq("id", freelancerUserId).maybeSingle();
          if (fp?.email) await sendAndLogNotification({ supabase: serviceClient, type: "dispute_auto_resolved", userId: freelancerUserId, dealId, email: fp.email, data: { dealTitle, dealSlug } });
        } else if (guestEmail) {
          await sendAndLogNotification({ supabase: serviceClient, type: "dispute_auto_resolved", userId: "guest", dealId, email: guestEmail, data: { dealTitle, dealSlug } });
        }
      } else {
        // No overlap → escalate
        await serviceClient.from("disputes").update({
          negotiation_round: 2,
          status: "under_review",
        }).eq("id", id);

        // Email both
        const { data: cp } = await serviceClient.from("user_profiles").select("email").eq("id", clientUserId).maybeSingle();
        if (cp?.email) await sendAndLogNotification({ supabase: serviceClient, type: "dispute_escalated", userId: clientUserId, dealId, email: cp.email, data: { dealTitle, dealSlug } });
        if (freelancerUserId) {
          const { data: fp } = await serviceClient.from("user_profiles").select("email").eq("id", freelancerUserId).maybeSingle();
          if (fp?.email) await sendAndLogNotification({ supabase: serviceClient, type: "dispute_escalated", userId: freelancerUserId, dealId, email: fp.email, data: { dealTitle, dealSlug } });
        } else if (guestEmail) {
          await sendAndLogNotification({ supabase: serviceClient, type: "dispute_escalated", userId: "guest", dealId, email: guestEmail, data: { dealTitle, dealSlug } });
        }
      }
    }

    // Return updated dispute
    const { data: finalDispute } = await serviceClient.from("disputes").select("*").eq("id", id).maybeSingle();
    return NextResponse.json({ ok: true, dispute: finalDispute });
  }
);
