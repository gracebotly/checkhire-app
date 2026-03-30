import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { openDisputeSchema } from "@/lib/validation/disputes";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { notifyAdmin } from "@/lib/email/adminNotify";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );

    const body = await req.json();
    const parsed = openDisputeSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 }
      );

    const { reason } = parsed.data;

    // Fetch deal
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!deal)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );

    // Must be a participant
    const isClient = deal.client_user_id === user.id;
    const isFreelancer = deal.freelancer_user_id === user.id;
    if (!isClient && !isFreelancer)
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a deal participant" },
        { status: 403 }
      );

    // Verify deal is in a disputable state
    const disputeableStatuses = [
      "funded",
      "in_progress",
      "submitted",
      "revision_requested",
    ];
    let canDispute = disputeableStatuses.includes(deal.status);

    // Also allow disputes up to 14 days after completion
    if (deal.status === "completed" && deal.completed_at) {
      const completedAt = new Date(deal.completed_at);
      const fourteenDaysLater = new Date(
        completedAt.getTime() + 14 * 24 * 60 * 60 * 1000
      );
      if (new Date() <= fourteenDaysLater) {
        canDispute = true;
      }
    }

    if (!canDispute)
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_STATUS",
          message: "This gig cannot be disputed in its current state",
        },
        { status: 400 }
      );

    // Check for existing open dispute
    const { data: existingDispute } = await supabase
      .from("disputes")
      .select("id")
      .eq("deal_id", id)
      .in("status", ["open", "under_review"])
      .maybeSingle();

    if (existingDispute)
      return NextResponse.json(
        {
          ok: false,
          code: "DISPUTE_EXISTS",
          message: "A dispute is already open for this gig",
        },
        { status: 400 }
      );

    const serviceClient = createServiceClient();

    // ATOMIC: Freeze deal + null out auto_release_at in one update
    // This prevents the auto-release cron from releasing funds between
    // the dispute insert and the deal update
    const previousStatus = deal.status;
    await serviceClient
      .from("deals")
      .update({
        status: "disputed",
        escrow_status: "frozen",
        auto_release_at: null,
      })
      .eq("id", id);

    // If deal has milestones with active countdowns, freeze those too
    if (deal.has_milestones) {
      await serviceClient
        .from("milestones")
        .update({ auto_release_at: null })
        .eq("deal_id", id)
        .not("auto_release_at", "is", null);
    }

    // Create dispute record
    const { data: dispute, error: disputeError } = await serviceClient
      .from("disputes")
      .insert({
        deal_id: id,
        initiated_by: user.id,
        reason,
        status: "open",
      })
      .select()
      .single();

    if (disputeError)
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: disputeError.message },
        { status: 500 }
      );

    // Get initiator's name for activity log and notifications
    const { data: initiatorProfile } = await serviceClient
      .from("user_profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const initiatorName = initiatorProfile?.display_name || "A participant";

    // Activity log
    const reasonPreview =
      reason.length > 100 ? reason.slice(0, 100) + "..." : reason;
    await serviceClient.from("deal_activity_log").insert({
      deal_id: id,
      user_id: null,
      entry_type: "system",
      content: `Dispute opened by ${initiatorName}: "${reasonPreview}"`,
    });

    // Notify the other party
    const otherPartyId = isClient
      ? deal.freelancer_user_id
      : deal.client_user_id;
    if (otherPartyId) {
      const { data: otherParty } = await serviceClient
        .from("user_profiles")
        .select("email")
        .eq("id", otherPartyId)
        .maybeSingle();

      if (otherParty?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "dispute_opened",
          userId: otherPartyId,
          dealId: id,
          email: otherParty.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            otherPartyName: initiatorName,
          },
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
        <p style="color: #475569; font-size: 14px;">Reason: "${reasonPreview}"</p>
        <p style="color: #475569; font-size: 14px;">Previous deal status: ${previousStatus}</p>
      `,
      dealSlug: deal.deal_link_slug,
    });

    return NextResponse.json({ ok: true, dispute });
  }
);
