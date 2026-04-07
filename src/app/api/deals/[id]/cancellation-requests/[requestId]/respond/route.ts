import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { respondCancellationRequestSchema } from "@/lib/validation/cancellation-requests";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { escalateCancellationRequestToDispute } from "@/lib/cancellation-requests/escalate";

export const POST = withApiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string; requestId: string }> }
  ) => {
    const { id: dealId, requestId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = respondCancellationRequestSchema.safeParse(body);
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

    const { action, response_reason } = parsed.data;
    const serviceClient = createServiceClient();

    // Fetch the cancellation request and the deal
    const { data: cancelReq } = await serviceClient
      .from("cancellation_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (!cancelReq || cancelReq.deal_id !== dealId) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Cancellation request not found" },
        { status: 404 }
      );
    }

    if (cancelReq.status !== "pending") {
      return NextResponse.json(
        {
          ok: false,
          code: "ALREADY_RESPONDED",
          message: "This cancellation request has already been responded to.",
        },
        { status: 400 }
      );
    }

    if (new Date(cancelReq.expires_at) < new Date()) {
      return NextResponse.json(
        {
          ok: false,
          code: "EXPIRED",
          message:
            "This cancellation request has expired. Refresh the page — it will be automatically escalated to a dispute.",
        },
        { status: 400 }
      );
    }

    const { data: deal } = await serviceClient
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Verify participant AND that responder is NOT the original requester
    const isClient = deal.client_user_id === user.id;
    const isFreelancer = deal.freelancer_user_id === user.id;
    if (!isClient && !isFreelancer) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a deal participant" },
        { status: 403 }
      );
    }

    if (cancelReq.requested_by === user.id) {
      return NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: "You cannot respond to your own cancellation request.",
        },
        { status: 403 }
      );
    }

    // Look up responder profile + requester profile for notification
    const { data: responderProfile } = await serviceClient
      .from("user_profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const responderName = responderProfile?.display_name || "The other party";

    const { data: requesterProfile } = await serviceClient
      .from("user_profiles")
      .select("display_name, email")
      .eq("id", cancelReq.requested_by)
      .maybeSingle();
    const requesterName = requesterProfile?.display_name || "The requester";

    const sharedNotificationData = {
      dealTitle: deal.title,
      dealSlug: deal.deal_link_slug,
      proposedClientRefund: cancelReq.proposed_client_refund_cents,
      proposedFreelancerPayout: cancelReq.proposed_freelancer_payout_cents,
      cancellationReason: cancelReq.reason || undefined,
      cancellationResponseReason: response_reason || undefined,
      requesterName,
      otherPartyName: responderName,
    };

    // ── Branch: REJECT ──
    if (action === "reject") {
      await serviceClient
        .from("cancellation_requests")
        .update({
          status: "rejected",
          responded_by: user.id,
          response_reason: response_reason || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      await serviceClient.from("deal_activity_log").insert({
        deal_id: dealId,
        user_id: null,
        entry_type: "system",
        content: `Cancellation request rejected by ${responderName}`,
      });

      // Email both parties
      if (requesterProfile?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "cancellation_rejected",
          userId: cancelReq.requested_by,
          dealId,
          email: requesterProfile.email,
          data: sharedNotificationData,
        });
      }
      if (responderProfile?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "cancellation_rejected",
          userId: user.id,
          dealId,
          email: responderProfile.email,
          data: sharedNotificationData,
        });
      }

      return NextResponse.json({ ok: true, status: "rejected" });
    }

    // ── Branch: ESCALATE ──
    if (action === "escalate") {
      const result = await escalateCancellationRequestToDispute({
        serviceClient,
        cancellationRequestId: requestId,
        dealId,
        triggeredByUserId: user.id,
        isAutomatic: false,
        disputeCategory: parsed.data.dispute_category,
        disputeReason: parsed.data.dispute_reason,
        disputeProposedPercentage: parsed.data.dispute_proposed_percentage,
        disputeJustification: parsed.data.dispute_justification,
      });

      if (!result.ok) {
        return NextResponse.json(
          { ok: false, code: "ESCALATE_FAILED", message: result.error },
          { status: 500 }
        );
      }

      await serviceClient.from("deal_activity_log").insert({
        deal_id: dealId,
        user_id: null,
        entry_type: "system",
        content: `Cancellation request escalated to formal dispute by ${responderName}`,
      });

      if (requesterProfile?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "cancellation_escalated",
          userId: cancelReq.requested_by,
          dealId,
          email: requesterProfile.email,
          data: sharedNotificationData,
        });
      }
      if (responderProfile?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "cancellation_escalated",
          userId: user.id,
          dealId,
          email: responderProfile.email,
          data: sharedNotificationData,
        });
      }

      return NextResponse.json({
        ok: true,
        status: "escalated",
        dispute_id: result.disputeId,
      });
    }

    // ── Branch: ACCEPT (the heavy path — Stripe refund + optional transfer) ──
    if (action === "accept") {
      const stripe = getStripe();
      const refundAmount = cancelReq.proposed_client_refund_cents;
      const freelancerAmount = cancelReq.proposed_freelancer_payout_cents;

      // Look up freelancer's Stripe Connect account if there's a payout to make
      let freelancerHasStripe = false;
      let freelancerStripeAccountId: string | null = null;
      if (freelancerAmount > 0 && deal.freelancer_user_id) {
        const { data: freelancer } = await serviceClient
          .from("user_profiles")
          .select("stripe_connected_account_id, stripe_onboarding_complete")
          .eq("id", deal.freelancer_user_id)
          .maybeSingle();
        if (
          freelancer?.stripe_connected_account_id &&
          freelancer.stripe_onboarding_complete
        ) {
          freelancerHasStripe = true;
          freelancerStripeAccountId = freelancer.stripe_connected_account_id;
        }
      }

      // Stripe transfer to freelancer (only if connected)
      if (freelancerAmount > 0 && freelancerHasStripe && freelancerStripeAccountId) {
        try {
          await stripe.transfers.create({
            amount: freelancerAmount,
            currency: "usd",
            destination: freelancerStripeAccountId,
            metadata: {
              deal_id: dealId,
              cancellation_request_id: requestId,
              reason: "mutual_cancellation",
            },
          });
        } catch (err) {
          console.error("[respond/accept] Stripe transfer failed:", err);
          return NextResponse.json(
            {
              ok: false,
              code: "STRIPE_ERROR",
              message: "Failed to transfer freelancer's portion. Please try again.",
            },
            { status: 500 }
          );
        }
      }

      // Stripe refund to client
      if (refundAmount > 0 && deal.stripe_payment_intent_id) {
        try {
          await stripe.refunds.create({
            payment_intent: deal.stripe_payment_intent_id,
            amount: refundAmount,
            metadata: {
              deal_id: dealId,
              cancellation_request_id: requestId,
              reason: "mutual_cancellation",
            },
          });
        } catch (err) {
          console.error("[respond/accept] Stripe refund failed:", err);
          return NextResponse.json(
            {
              ok: false,
              code: "STRIPE_ERROR",
              message: "Failed to refund client's portion. Please try again.",
            },
            { status: 500 }
          );
        }
      }

      // Determine new escrow status
      let newEscrowStatus: string;
      if (freelancerAmount === 0) {
        newEscrowStatus = "refunded";
      } else if (refundAmount === 0) {
        newEscrowStatus = "fully_released";
      } else {
        newEscrowStatus = "partially_released";
      }

      // Mark cancellation request accepted
      await serviceClient
        .from("cancellation_requests")
        .update({
          status: "accepted",
          responded_by: user.id,
          response_reason: response_reason || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      // Update deal status
      const newDealStatus = freelancerAmount === 0 ? "refunded" : "cancelled";
      await serviceClient
        .from("deals")
        .update({
          status: newDealStatus,
          escrow_status: newEscrowStatus,
          cancelled_at: new Date().toISOString(),
          auto_release_at: null,
        })
        .eq("id", dealId);

      // Activity log
      const refundDisplay = (refundAmount / 100).toFixed(2);
      const payoutDisplay = (freelancerAmount / 100).toFixed(2);
      const escrowNote =
        freelancerAmount > 0 && !freelancerHasStripe
          ? " (held in escrow until Stripe is connected)"
          : "";
      await serviceClient.from("deal_activity_log").insert({
        deal_id: dealId,
        user_id: null,
        entry_type: "system",
        content: `Mutual cancellation accepted by ${responderName} — $${refundDisplay} refunded to client, $${payoutDisplay} to freelancer${escrowNote}`,
      });

      // Email both parties
      if (requesterProfile?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "cancellation_accepted",
          userId: cancelReq.requested_by,
          dealId,
          email: requesterProfile.email,
          data: sharedNotificationData,
        });
      }
      if (responderProfile?.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "cancellation_accepted",
          userId: user.id,
          dealId,
          email: responderProfile.email,
          data: sharedNotificationData,
        });
      }

      return NextResponse.json({ ok: true, status: "accepted" });
    }

    // Should never reach here due to zod enum
    return NextResponse.json(
      { ok: false, code: "INVALID_ACTION", message: "Unknown action" },
      { status: 400 }
    );
  }
);
