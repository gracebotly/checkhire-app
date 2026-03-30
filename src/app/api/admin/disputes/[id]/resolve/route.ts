import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { resolveDisputeSchema } from "@/lib/validation/disputes";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const PATCH = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const adminCheck = await verifyAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const body = await req.json();
    const parsed = resolveDisputeSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 }
      );

    const { resolution, resolution_notes, resolution_amount, apply_dispute_fee } =
      parsed.data;

    const stripe = getStripe();
    const serviceClient = createServiceClient();

    // Fetch dispute + deal
    const { data: dispute } = await serviceClient
      .from("disputes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!dispute)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Dispute not found" },
        { status: 404 }
      );

    if (!["open", "under_review"].includes(dispute.status))
      return NextResponse.json(
        { ok: false, code: "ALREADY_RESOLVED", message: "Dispute already resolved" },
        { status: 400 }
      );

    const { data: deal } = await serviceClient
      .from("deals")
      .select("*")
      .eq("id", dispute.deal_id)
      .maybeSingle();

    if (!deal)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );

    // Get freelancer Stripe account
    const { data: freelancerProfile } = await serviceClient
      .from("user_profiles")
      .select("stripe_connected_account_id, stripe_onboarding_complete, email, display_name, completed_deals_count")
      .eq("id", deal.freelancer_user_id!)
      .maybeSingle();

    const { data: clientProfile } = await serviceClient
      .from("user_profiles")
      .select("email, display_name, completed_deals_count")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    // Calculate amounts
    const totalAmount = deal.total_amount; // cents
    let freelancerAmount = 0;
    let refundAmount = 0;
    let disputeFeeAmount = 0;
    let disputeFeeTarget: "client" | "freelancer" | null = null;
    let resolvedStatus: string;

    if (resolution === "release") {
      freelancerAmount = totalAmount;
      refundAmount = 0;
      resolvedStatus = "resolved_release";
      if (apply_dispute_fee) {
        disputeFeeAmount = Math.round(totalAmount * 0.05);
        disputeFeeTarget = "client";
      }
    } else if (resolution === "refund") {
      freelancerAmount = 0;
      refundAmount = totalAmount;
      resolvedStatus = "resolved_refund";
      if (apply_dispute_fee) {
        disputeFeeAmount = Math.round(totalAmount * 0.05);
        disputeFeeTarget = "freelancer";
      }
    } else {
      // partial
      if (resolution_amount === undefined || resolution_amount === null)
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", message: "resolution_amount required for partial split" },
          { status: 400 }
        );
      if (resolution_amount < 0 || resolution_amount > totalAmount)
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", message: "resolution_amount must be between 0 and deal total" },
          { status: 400 }
        );

      freelancerAmount = resolution_amount;
      refundAmount = totalAmount - resolution_amount;
      resolvedStatus = "resolved_partial";
      if (apply_dispute_fee) {
        disputeFeeAmount = Math.round(totalAmount * 0.05);
        // Fee goes to the party that got less than 50%
        if (freelancerAmount < refundAmount) {
          disputeFeeTarget = "freelancer";
          freelancerAmount = Math.max(0, freelancerAmount - disputeFeeAmount);
        } else {
          disputeFeeTarget = "client";
          refundAmount = Math.max(0, refundAmount - disputeFeeAmount);
        }
      }
    }

    // Execute Stripe Transfer (to freelancer)
    if (
      freelancerAmount > 0 &&
      freelancerProfile?.stripe_connected_account_id &&
      freelancerProfile.stripe_onboarding_complete
    ) {
      try {
        await stripe.transfers.create({
          amount: freelancerAmount,
          currency: "usd",
          destination: freelancerProfile.stripe_connected_account_id,
          metadata: {
            deal_id: deal.id,
            dispute_id: id,
            reason: "dispute_resolution",
          },
        });
      } catch (err) {
        console.error("[resolve] Stripe transfer failed:", err);
        return NextResponse.json(
          { ok: false, code: "STRIPE_ERROR", message: "Failed to transfer funds to freelancer" },
          { status: 500 }
        );
      }
    }

    // Execute Stripe Refund (to client)
    if (refundAmount > 0 && deal.stripe_payment_intent_id) {
      try {
        await stripe.refunds.create({
          payment_intent: deal.stripe_payment_intent_id,
          amount: refundAmount,
          metadata: {
            deal_id: deal.id,
            dispute_id: id,
            reason: "dispute_resolution",
          },
        });
      } catch (err) {
        console.error("[resolve] Stripe refund failed:", err);
        return NextResponse.json(
          { ok: false, code: "STRIPE_ERROR", message: "Failed to refund client" },
          { status: 500 }
        );
      }
    }

    // Update dispute
    await serviceClient
      .from("disputes")
      .update({
        status: resolvedStatus,
        resolution_notes,
        resolution_amount: freelancerAmount,
        dispute_fee_amount: disputeFeeAmount || null,
        dispute_fee_charged_to: disputeFeeTarget,
        resolved_at: new Date().toISOString(),
        resolved_by: adminCheck.userId,
      })
      .eq("id", id);

    // Update deal status
    const newDealStatus = resolution === "refund" ? "refunded" : "completed";
    const newEscrowStatus = resolution === "refund" ? "refunded" : "fully_released";
    await serviceClient
      .from("deals")
      .update({
        status: newDealStatus,
        escrow_status: newEscrowStatus,
        completed_at:
          newDealStatus === "completed"
            ? new Date().toISOString()
            : deal.completed_at,
      })
      .eq("id", deal.id);

    // Update completed_deals_count if funds released to freelancer
    if (freelancerAmount > 0) {
      if (clientProfile) {
        await serviceClient
          .from("user_profiles")
          .update({
            completed_deals_count:
              (clientProfile.completed_deals_count || 0) + 1,
          })
          .eq("id", deal.client_user_id);
      }
      if (freelancerProfile) {
        await serviceClient
          .from("user_profiles")
          .update({
            completed_deals_count:
              (freelancerProfile.completed_deals_count || 0) + 1,
          })
          .eq("id", deal.freelancer_user_id!);
      }
    }

    // Activity log
    const decisionLabel =
      resolution === "release"
        ? "Release to freelancer"
        : resolution === "refund"
          ? "Refund to client"
          : `Partial split — $${(freelancerAmount / 100).toFixed(2)} to freelancer, $${(refundAmount / 100).toFixed(2)} refunded`;
    const notesPreview =
      resolution_notes.length > 150
        ? resolution_notes.slice(0, 150) + "..."
        : resolution_notes;
    await serviceClient.from("deal_activity_log").insert({
      deal_id: deal.id,
      user_id: null,
      entry_type: "system",
      content: `Dispute resolved: ${decisionLabel}. ${notesPreview}`,
    });

    // Notify both parties
    if (clientProfile?.email) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "dispute_resolved",
        userId: deal.client_user_id,
        dealId: deal.id,
        email: clientProfile.email,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
        },
      });
    }
    if (freelancerProfile?.email) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "dispute_resolved",
        userId: deal.freelancer_user_id!,
        dealId: deal.id,
        email: freelancerProfile.email,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
        },
      });
    }

    // Flag users with 3+ lost disputes
    const losingPartyId =
      resolution === "release"
        ? deal.client_user_id
        : resolution === "refund"
          ? deal.freelancer_user_id
          : null; // partial = no clear loser

    if (losingPartyId) {
      const { data: lostDisputes } = await serviceClient
        .from("disputes")
        .select("id")
        .or(
          `deal_id.in.(${
            "select id from deals where client_user_id = '" + losingPartyId + "' or freelancer_user_id = '" + losingPartyId + "'"
          })`
        )
        .in("status", ["resolved_release", "resolved_refund"]);

      const lostCount = lostDisputes?.length || 0;
      if (lostCount >= 3) {
        console.warn(
          `[dispute-flag] User ${losingPartyId} has ${lostCount} lost disputes — review for suspension`
        );
      }
    }

    return NextResponse.json({ ok: true });
  }
);
