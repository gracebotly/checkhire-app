import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { verifyGuestToken } from "@/lib/deals/guestToken";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
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
    let requesterName = "A participant";

    // Check for guest token in body
    let guestToken: string | null = null;
    try {
      const body = await req.json();
      guestToken = body.guest_token || null;
    } catch {
      // No body or not JSON — that's fine
    }

    if (guestToken) {
      const guestEmail = deal.guest_freelancer_email as string | null;
      if (guestEmail && verifyGuestToken(guestToken, deal.id as string, guestEmail)) {
        isGuest = true;
        requesterName = (deal.guest_freelancer_name as string) || "Guest freelancer";
      }
    }

    if (!isGuest) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user)
        return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });
      userId = user.id;

      const { data: profile } = await serviceClient.from("user_profiles").select("display_name").eq("id", userId).maybeSingle();
      requesterName = profile?.display_name || "A participant";
    }

    // Verify participant
    const isClient = userId === deal.client_user_id;
    const isFreelancer = userId === deal.freelancer_user_id;
    const isGuestFreelancer = isGuest;

    if (!isClient && !isFreelancer && !isGuestFreelancer)
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not a participant" }, { status: 403 });

    // Check extension limit
    if (dispute.extension_count >= 4)
      return NextResponse.json(
        { ok: false, code: "EXTENSION_LIMIT", message: "Maximum number of extensions (4) reached." },
        { status: 400 }
      );

    // Add 48 hours to both deadlines
    const fortyEightHours = 48 * 60 * 60 * 1000;
    const newEvidenceDeadline = dispute.evidence_deadline_at
      ? new Date(new Date(dispute.evidence_deadline_at).getTime() + fortyEightHours).toISOString()
      : new Date(Date.now() + fortyEightHours).toISOString();
    const newResponseDeadline = dispute.response_deadline_at
      ? new Date(new Date(dispute.response_deadline_at).getTime() + fortyEightHours).toISOString()
      : new Date(Date.now() + fortyEightHours).toISOString();

    await serviceClient.from("disputes").update({
      evidence_deadline_at: newEvidenceDeadline,
      response_deadline_at: newResponseDeadline,
      extension_count: dispute.extension_count + 1,
    }).eq("id", id);

    // Activity log
    const dealId = deal.id as string;
    await serviceClient.from("deal_activity_log").insert({
      deal_id: dealId,
      user_id: null,
      entry_type: "system",
      content: `48-hour extension requested by ${requesterName}`,
    });

    // Email the OTHER party only
    const dealTitle = deal.title as string;
    const dealSlug = deal.deal_link_slug as string;
    const clientUserId = deal.client_user_id as string;

    if (isClient) {
      // Notify freelancer
      const freelancerUserId = deal.freelancer_user_id as string | null;
      const guestEmail = deal.guest_freelancer_email as string | null;
      if (freelancerUserId) {
        const { data: fp } = await serviceClient.from("user_profiles").select("email").eq("id", freelancerUserId).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({ supabase: serviceClient, type: "dispute_proposal_received", userId: freelancerUserId, dealId, email: fp.email, data: { dealTitle, dealSlug, otherPartyName: requesterName } });
        }
      } else if (guestEmail) {
        await sendAndLogNotification({ supabase: serviceClient, type: "dispute_proposal_received", userId: "guest", dealId, email: guestEmail, data: { dealTitle, dealSlug, otherPartyName: requesterName } });
      }
    } else {
      // Notify client
      const { data: cp } = await serviceClient.from("user_profiles").select("email").eq("id", clientUserId).maybeSingle();
      if (cp?.email) {
        await sendAndLogNotification({ supabase: serviceClient, type: "dispute_proposal_received", userId: clientUserId, dealId, email: cp.email, data: { dealTitle, dealSlug, otherPartyName: requesterName } });
      }
    }

    // Return updated dispute
    const { data: updated } = await serviceClient.from("disputes").select("*").eq("id", id).maybeSingle();
    return NextResponse.json({ ok: true, dispute: updated });
  }
);
