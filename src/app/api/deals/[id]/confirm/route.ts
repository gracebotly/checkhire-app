import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { confirmDeliverySchema } from "@/lib/validation/escrow";
import { sendAndLogNotification } from "@/lib/email/logNotification";

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

    // Get freelancer's Stripe account
    const { data: freelancerProfile } = await supabase.from("user_profiles").select("stripe_connected_account_id, stripe_onboarding_complete, email, display_name").eq("id", deal.freelancer_user_id!).maybeSingle();
    if (!freelancerProfile?.stripe_connected_account_id || !freelancerProfile.stripe_onboarding_complete) {
      return NextResponse.json({ ok: false, code: "STRIPE_NOT_CONNECTED", message: "Freelancer must connect their Stripe account to receive payment" }, { status: 400 });
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
        destination: freelancerProfile.stripe_connected_account_id,
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
        destination: freelancerProfile.stripe_connected_account_id,
        metadata: { deal_id: id },
      });

      await serviceClient.from("deals").update({ status: "completed", escrow_status: "fully_released", completed_at: new Date().toISOString(), auto_release_at: null }).eq("id", id);
    }

    // Activity log
    await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: activityMessage });

    // Email freelancer about release
    if (freelancerProfile.email) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: milestone_id ? "milestone_approved" : "funds_released",
        userId: deal.freelancer_user_id!,
        dealId: id,
        email: freelancerProfile.email,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          amount: releaseAmount,
          milestoneTitle,
          isGuestFreelancer: !!deal.guest_freelancer_email,
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
      const { data: freelancerData } = await serviceClient
        .from("user_profiles")
        .select("completed_deals_count")
        .eq("id", deal.freelancer_user_id!)
        .maybeSingle();

      if (clientData) {
        await serviceClient
          .from("user_profiles")
          .update({ completed_deals_count: (clientData.completed_deals_count || 0) + 1 })
          .eq("id", deal.client_user_id);
      }
      if (freelancerData) {
        await serviceClient
          .from("user_profiles")
          .update({ completed_deals_count: (freelancerData.completed_deals_count || 0) + 1 })
          .eq("id", deal.freelancer_user_id!);
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
            otherPartyName: freelancerProfile.display_name || "the freelancer",
          },
        });
      }

      // Send deal_completed (rating prompt) to freelancer
      if (freelancerProfile.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "deal_completed",
          userId: deal.freelancer_user_id!,
          dealId: id,
          email: freelancerProfile.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            otherPartyName: clientData?.display_name || "the client",
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  }
);
