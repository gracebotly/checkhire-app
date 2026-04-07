import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { confirmDeliverySchema } from "@/lib/validation/escrow";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { calculateReferralCommission } from "@/lib/referrals/commission";
import { notifyAdmin } from "@/lib/slack/notify";
import { payoutCompleted } from "@/lib/slack/templates";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const stripe = getStripe();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = confirmDeliverySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

    const { milestone_id } = parsed.data;

    const { data: deal } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    if (!deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });
    if (deal.client_user_id !== user.id) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can confirm delivery" }, { status: 403 });

    // ── Moderation guard: block payouts for unreviewed deals ──
    if (deal.review_status && deal.review_status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          code: "MODERATION_HOLD",
          message:
            deal.review_status === "rejected"
              ? "This gig has been removed and funds cannot be released."
              : "This gig is being verified by CheckHire. Payouts will be enabled once verification is complete.",
        },
        { status: 403 }
      );
    }

    // Get freelancer's Stripe account — handle both authenticated and guest freelancers
    let destinationAccountId: string | null = null;
    let freelancerEmail: string | null = null;
    let freelancerDisplayName: string | null = null;
    let freelancerUserId: string | null = null;
    const isGuestFreelancer = !deal.freelancer_user_id && !!deal.guest_freelancer_email;

    if (deal.freelancer_user_id) {
      // Authenticated freelancer
      const { data: freelancerProfile } = await supabase
        .from("user_profiles")
        .select("stripe_connected_account_id, stripe_onboarding_complete, email, display_name")
        .eq("id", deal.freelancer_user_id)
        .maybeSingle();
      if (!freelancerProfile?.stripe_connected_account_id || !freelancerProfile.stripe_onboarding_complete) {
        return NextResponse.json({ ok: false, code: "STRIPE_NOT_CONNECTED", message: "Freelancer must connect their Stripe account to receive payment" }, { status: 400 });
      }
      destinationAccountId = freelancerProfile.stripe_connected_account_id;
      freelancerEmail = freelancerProfile.email;
      freelancerDisplayName = freelancerProfile.display_name;
      freelancerUserId = deal.freelancer_user_id;
    } else if (isGuestFreelancer) {
      // Guest freelancer — check Stripe account live since we don't store onboarding flag
      if (!deal.guest_freelancer_stripe_account_id) {
        return NextResponse.json({ ok: false, code: "STRIPE_NOT_CONNECTED", message: "Freelancer must connect their Stripe account to receive payment" }, { status: 400 });
      }
      try {
        const account = await stripe.accounts.retrieve(deal.guest_freelancer_stripe_account_id);
        if (!account.details_submitted || !account.charges_enabled) {
          return NextResponse.json({ ok: false, code: "STRIPE_NOT_CONNECTED", message: "Freelancer must complete Stripe onboarding before payment can be released" }, { status: 400 });
        }
      } catch (err) {
        console.error("[confirm] Failed to retrieve guest Stripe account:", err);
        return NextResponse.json({ ok: false, code: "STRIPE_ERROR", message: "Could not verify freelancer payment account" }, { status: 500 });
      }
      destinationAccountId = deal.guest_freelancer_stripe_account_id;
      freelancerEmail = deal.guest_freelancer_email;
      freelancerDisplayName = deal.guest_freelancer_name || "Freelancer";
      freelancerUserId = null;
    } else {
      return NextResponse.json({ ok: false, code: "NO_FREELANCER", message: "This deal has no freelancer assigned" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    let releaseAmount: number;
    let activityMessage: string;
    let milestoneTitle: string | undefined;

    if (milestone_id) {
      const { data: milestone } = await supabase.from("milestones").select("*").eq("id", milestone_id).eq("deal_id", id).maybeSingle();
      if (!milestone) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
      if (milestone.status !== "submitted") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Milestone has not been submitted" }, { status: 400 });

      releaseAmount = milestone.amount;
      milestoneTitle = milestone.title;
      activityMessage = `Client approved milestone "${milestone.title}" — $${(releaseAmount / 100).toFixed(2)} released`;

      // Stripe Transfer
      await stripe.transfers.create({
        amount: releaseAmount,
        currency: "usd",
        destination: destinationAccountId!,
        metadata: { deal_id: id, milestone_id },
      });

      await serviceClient.from("milestones").update({ status: "released", released_at: new Date().toISOString(), auto_release_at: null }).eq("id", milestone_id);

      // Check if all milestones released
      const { data: allMs } = await supabase.from("milestones").select("status").eq("deal_id", id);
      const allReleased = allMs?.every(m => m.status === "released") ?? false;

      if (allReleased) {
        await serviceClient.from("deals").update({ status: "completed", escrow_status: "fully_released", completed_at: new Date().toISOString(), auto_release_at: null }).eq("id", id);
      } else {
        await serviceClient.from("deals").update({ escrow_status: "partially_released" }).eq("id", id);
      }

    } else {
      if (deal.status !== "submitted") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Work has not been submitted" }, { status: 400 });

      releaseAmount = deal.total_amount;
      activityMessage = `Client confirmed delivery — $${(releaseAmount / 100).toFixed(2)} released`;

      await stripe.transfers.create({
        amount: releaseAmount,
        currency: "usd",
        destination: destinationAccountId!,
        metadata: { deal_id: id },
      });

      await serviceClient.from("deals").update({ status: "completed", escrow_status: "fully_released", completed_at: new Date().toISOString(), auto_release_at: null }).eq("id", id);
    }

    // Activity log
    await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: activityMessage });

    // Email freelancer about release — works for both auth and guest
    if (freelancerEmail) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: milestone_id ? "milestone_approved" : "funds_released",
        userId: freelancerUserId,
        dealId: id,
        email: freelancerEmail,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          amount: releaseAmount,
          milestoneTitle,
          isGuestFreelancer,
        },
      });
    }

    // If deal is fully complete, handle completion logic
    const { data: isFullyComplete } = await supabase.from("deals").select("status").eq("id", id).maybeSingle();
    if (isFullyComplete?.status === "completed") {
      // Increment completed_deals_count for both
      const { data: clientData } = await serviceClient
        .from("user_profiles")
        .select("completed_deals_count, email, display_name")
        .eq("id", deal.client_user_id)
        .maybeSingle();

      if (clientData) {
        await serviceClient
          .from("user_profiles")
          .update({ completed_deals_count: (clientData.completed_deals_count || 0) + 1 })
          .eq("id", deal.client_user_id);
      }

      if (deal.freelancer_user_id) {
        const { data: freelancerData } = await serviceClient
          .from("user_profiles")
          .select("completed_deals_count")
          .eq("id", deal.freelancer_user_id)
          .maybeSingle();

        if (freelancerData) {
          await serviceClient
            .from("user_profiles")
            .update({ completed_deals_count: (freelancerData.completed_deals_count || 0) + 1 })
            .eq("id", deal.freelancer_user_id);
        }
      }

      // Credit referral commission (if client was referred)
      try {
        await calculateReferralCommission(id);
      } catch (err) {
        console.error("[Referral] Commission calculation failed for deal:", id, err);
        // Non-blocking — don't fail the confirm response
      }

      // Send deal_completed to client
      if (clientData?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "deal_completed",
          userId: deal.client_user_id,
          dealId: id,
          email: clientData.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            otherPartyName: freelancerDisplayName || "the freelancer",
          },
        });
      }

      // Slack: notify admin of completed payout
      void notifyAdmin(payoutCompleted({
        id: id,
        title: deal.title,
        deal_link_slug: deal.deal_link_slug,
        total_amount: releaseAmount,
        freelancer_name: freelancerDisplayName || freelancerEmail || "Freelancer",
        payout_method: "standard",
      }));
    }

    return NextResponse.json({ ok: true });
  }
);
