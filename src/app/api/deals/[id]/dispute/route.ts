import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { openDisputeSchema } from "@/lib/validation/disputes";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { notifyAdmin } from "@/lib/email/adminNotify";
import { verifyGuestToken } from "@/lib/deals/guestToken";
import { notifyAdmin as slackNotifyAdmin } from "@/lib/slack/notify";
import { disputeOpened } from "@/lib/slack/templates";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const body = await req.json();
    const parsed = openDisputeSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );

    const { category, reason, proposed_percentage, justification, guest_token } = parsed.data;

    const serviceClient = createServiceClient();

    // Auth: session or guest token
    let userId: string | null = null;
    let isGuest = false;
    let initiatorName = "A participant";

    if (guest_token) {
      // Guest auth — fetch deal to verify token
      const { data: deal } = await serviceClient
        .from("deals")
        .select("id, guest_freelancer_email, guest_freelancer_name")
        .eq("id", id)
        .maybeSingle();

      if (deal?.guest_freelancer_email && verifyGuestToken(guest_token, id, deal.guest_freelancer_email)) {
        isGuest = true;
        initiatorName = deal.guest_freelancer_name || "Guest freelancer";
      }
    }

    if (!isGuest) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user)
        return NextResponse.json(
          { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
          { status: 401 }
        );
      userId = user.id;
    }

    // Fetch deal
    const { data: deal } = await serviceClient
      .from("deals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!deal)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );

    // Verify participant
    const isClient = userId === deal.client_user_id;
    const isFreelancer = userId === deal.freelancer_user_id;
    const isGuestFreelancer = isGuest;

    if (!isClient && !isFreelancer && !isGuestFreelancer)
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a deal participant" },
        { status: 403 }
      );

    // Verify deal is in a disputable state
    const disputeableStatuses = ["funded", "in_progress", "submitted", "revision_requested"];
    let canDispute = disputeableStatuses.includes(deal.status);

    // Also allow disputes up to 14 days after completion
    if (deal.status === "completed" && deal.completed_at) {
      const completedAt = new Date(deal.completed_at);
      const fourteenDaysLater = new Date(completedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (new Date() <= fourteenDaysLater) canDispute = true;
    }

    if (!canDispute)
      return NextResponse.json(
        { ok: false, code: "INVALID_STATUS", message: "This gig cannot be disputed in its current state" },
        { status: 400 }
      );

    // Check for existing open dispute
    const { data: existingDispute } = await serviceClient
      .from("disputes")
      .select("id")
      .eq("deal_id", id)
      .in("status", ["open", "under_review"])
      .maybeSingle();

    if (existingDispute)
      return NextResponse.json(
        { ok: false, code: "DISPUTE_EXISTS", message: "A dispute is already open for this gig" },
        { status: 400 }
      );

    // Get initiator name if not guest
    if (userId && !isGuest) {
      const { data: profile } = await serviceClient
        .from("user_profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      initiatorName = profile?.display_name || "A participant";
    }

    const previousStatus = deal.status;
    const now = new Date();
    const deadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    // ATOMIC: Freeze deal + null out auto_release_at
    await serviceClient
      .from("deals")
      .update({
        status: "disputed",
        escrow_status: "frozen",
        auto_release_at: null,
      })
      .eq("id", id);

    // Freeze milestone countdowns
    if (deal.has_milestones) {
      await serviceClient
        .from("milestones")
        .update({ auto_release_at: null })
        .eq("deal_id", id)
        .not("auto_release_at", "is", null);
    }

    // Create dispute record with structured fields
    const { data: dispute, error: disputeError } = await serviceClient
      .from("disputes")
      .insert({
        deal_id: id,
        initiated_by: userId || "guest",
        reason,
        status: "open",
        category,
        claimant_proposed_percentage: proposed_percentage,
        claimant_justification: justification,
        evidence_deadline_at: deadlineAt,
        response_deadline_at: deadlineAt,
      })
      .select()
      .single();

    if (disputeError)
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: disputeError.message },
        { status: 500 }
      );

    // Activity log
    const reasonPreview = reason.length > 100 ? reason.slice(0, 100) + "..." : reason;
    await serviceClient.from("deal_activity_log").insert({
      deal_id: id,
      user_id: null,
      entry_type: "system",
      content: `Dispute opened by ${initiatorName} — Category: ${category}`,
    });

    // Notify the other party
    if (isClient && deal.freelancer_user_id) {
      const { data: freelancer } = await serviceClient
        .from("user_profiles")
        .select("email")
        .eq("id", deal.freelancer_user_id)
        .maybeSingle();
      if (freelancer?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "dispute_opened",
          userId: deal.freelancer_user_id,
          dealId: id,
          email: freelancer.email,
          data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, otherPartyName: initiatorName },
        });
      }
    } else if (isClient && deal.guest_freelancer_email) {
      // Notify guest freelancer
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "dispute_opened",
        userId: "guest",
        dealId: id,
        email: deal.guest_freelancer_email,
        data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, otherPartyName: initiatorName },
      });
    } else {
      // Freelancer/guest opened → notify client
      const { data: clientProfile } = await serviceClient
        .from("user_profiles")
        .select("email")
        .eq("id", deal.client_user_id)
        .maybeSingle();
      if (clientProfile?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "dispute_opened",
          userId: deal.client_user_id,
          dealId: id,
          email: clientProfile.email,
          data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, otherPartyName: initiatorName },
        });
      }
    }

    // Notify platform admin
    await notifyAdmin({
      subject: `New Dispute: ${deal.title} ($${(deal.total_amount / 100).toFixed(2)})`,
      body: `
        <h2 style="color: #dc2626; font-size: 20px;">Dispute Opened</h2>
        <p style="color: #475569; font-size: 14px;">
          <strong>${initiatorName}</strong> opened a dispute on <strong>${deal.title}</strong> ($${(deal.total_amount / 100).toFixed(2)}).
        </p>
        <p style="color: #475569; font-size: 14px;">Category: ${category} | Proposed: ${proposed_percentage}% to freelancer</p>
        <p style="color: #475569; font-size: 14px;">Reason: "${reasonPreview}"</p>
        <p style="color: #475569; font-size: 14px;">Previous deal status: ${previousStatus}</p>
      `,
      dealSlug: deal.deal_link_slug,
    });


    // Slack: notify admin of dispute
    void slackNotifyAdmin(disputeOpened({
      deal_id: id,
      deal_title: deal.title,
      deal_link_slug: deal.deal_link_slug,
      deal_amount: deal.total_amount,
      category,
      initiated_by_name: initiatorName,
      initiated_by_role: isClient ? "client" : "freelancer",
    }));

    return NextResponse.json({ ok: true, dispute });
  }
);
