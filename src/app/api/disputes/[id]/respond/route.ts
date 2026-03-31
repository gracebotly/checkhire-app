import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { disputeRespondSchema } from "@/lib/validation/disputes";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { verifyGuestToken } from "@/lib/deals/guestToken";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();

    const parsed = disputeRespondSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );

    const { proposed_percentage, justification, guest_token } = parsed.data;
    const serviceClient = createServiceClient();

    // Auth
    let userId: string | null = null;
    let isGuest = false;

    // Fetch dispute + deal
    const { data: dispute } = await serviceClient
      .from("disputes")
      .select("*, deal:deals!inner(*)")
      .eq("id", id)
      .maybeSingle();

    if (!dispute)
      return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Dispute not found" }, { status: 404 });

    const deal = dispute.deal as Record<string, unknown>;

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

    // Verify respondent is the OTHER party (not the person who opened the dispute)
    const isClient = userId === deal.client_user_id;
    const isFreelancer = userId === deal.freelancer_user_id;
    const isGuestFreelancer = isGuest;

    if (!isClient && !isFreelancer && !isGuestFreelancer)
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not a participant" }, { status: 403 });

    // Check this is the respondent (not the initiator)
    if (userId && dispute.initiated_by === userId)
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "You already submitted a proposal." },
        { status: 400 }
      );

    if (isGuest && dispute.initiated_by === "guest")
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "You already submitted a proposal." },
        { status: 400 }
      );

    // Verify hasn't responded yet
    if (dispute.respondent_proposed_percentage !== null)
      return NextResponse.json(
        { ok: false, code: "ALREADY_RESPONDED", message: "A response has already been submitted." },
        { status: 400 }
      );

    // Store response
    await serviceClient
      .from("disputes")
      .update({
        respondent_proposed_percentage: proposed_percentage,
        respondent_justification: justification,
      })
      .eq("id", id);

    // Auto-resolution check
    // Both percentages represent "% of deal amount to freelancer"
    // Determine who is client and who is freelancer in the dispute
    const claimantIsClient = dispute.initiated_by === (deal.client_user_id as string);

    let clientOffer: number;
    let freelancerAsk: number;

    if (claimantIsClient) {
      // Claimant is client, respondent is freelancer
      clientOffer = dispute.claimant_proposed_percentage as number; // client's offer to freelancer
      freelancerAsk = proposed_percentage; // freelancer's ask
    } else {
      // Claimant is freelancer, respondent is client
      freelancerAsk = dispute.claimant_proposed_percentage as number; // freelancer's ask
      clientOffer = proposed_percentage; // client's offer to freelancer
    }

    let autoResolved = false;
    let resolvedPercentage: number | null = null;

    if (clientOffer >= freelancerAsk) {
      // Client is willing to give more than freelancer asks → resolve at freelancer's ask
      autoResolved = true;
      resolvedPercentage = freelancerAsk;
    } else if (clientOffer === freelancerAsk) {
      autoResolved = true;
      resolvedPercentage = clientOffer;
    }

    const dealId = deal.id as string;
    const dealTitle = deal.title as string;
    const dealSlug = deal.deal_link_slug as string;
    const totalAmount = deal.total_amount as number;

    if (autoResolved && resolvedPercentage !== null) {
      const resolutionAmount = Math.round(totalAmount * resolvedPercentage / 100);
      await serviceClient
        .from("disputes")
        .update({
          auto_resolved: true,
          status: "resolved_partial",
          resolution_amount: resolutionAmount,
          resolution_notes: `Auto-resolved: ${resolvedPercentage}% to freelancer (client offered ${clientOffer}%, freelancer asked ${freelancerAsk}%)`,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Email both parties
      const clientUserId = deal.client_user_id as string;
      const freelancerUserId = deal.freelancer_user_id as string | null;
      const guestEmail = deal.guest_freelancer_email as string | null;

      const { data: clientProfile } = await serviceClient.from("user_profiles").select("email").eq("id", clientUserId).maybeSingle();
      if (clientProfile?.email) {
        await sendAndLogNotification({ supabase: serviceClient, type: "dispute_auto_resolved", userId: clientUserId, dealId, email: clientProfile.email, data: { dealTitle, dealSlug } });
      }
      if (freelancerUserId) {
        const { data: fp } = await serviceClient.from("user_profiles").select("email").eq("id", freelancerUserId).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({ supabase: serviceClient, type: "dispute_auto_resolved", userId: freelancerUserId, dealId, email: fp.email, data: { dealTitle, dealSlug } });
        }
      } else if (guestEmail) {
        await sendAndLogNotification({ supabase: serviceClient, type: "dispute_auto_resolved", userId: "guest", dealId, email: guestEmail, data: { dealTitle, dealSlug } });
      }
    } else {
      // Not resolved → start negotiation round 1
      await serviceClient
        .from("disputes")
        .update({ negotiation_round: 1 })
        .eq("id", id);

      // Email both
      const clientUserId = deal.client_user_id as string;
      const freelancerUserId = deal.freelancer_user_id as string | null;
      const guestEmail = deal.guest_freelancer_email as string | null;

      const { data: clientProfile } = await serviceClient.from("user_profiles").select("email").eq("id", clientUserId).maybeSingle();
      if (clientProfile?.email) {
        await sendAndLogNotification({ supabase: serviceClient, type: "dispute_negotiation_round", userId: clientUserId, dealId, email: clientProfile.email, data: { dealTitle, dealSlug } });
      }
      if (freelancerUserId) {
        const { data: fp } = await serviceClient.from("user_profiles").select("email").eq("id", freelancerUserId).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({ supabase: serviceClient, type: "dispute_negotiation_round", userId: freelancerUserId, dealId, email: fp.email, data: { dealTitle, dealSlug } });
        }
      } else if (guestEmail) {
        await sendAndLogNotification({ supabase: serviceClient, type: "dispute_negotiation_round", userId: "guest", dealId, email: guestEmail, data: { dealTitle, dealSlug } });
      }
    }

    // Fetch updated dispute
    const { data: updated } = await serviceClient.from("disputes").select("*").eq("id", id).maybeSingle();
    return NextResponse.json({ ok: true, dispute: updated });
  }
);
