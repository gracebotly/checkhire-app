import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { calculateReferralCommission } from "@/lib/referrals/commission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const supabase = createServiceClient();
  let dealsReleased = 0;
  let milestonesReleased = 0;

  try {
    // ── Auto-release deals ──
    const { data: expiredDeals } = await supabase
      .from("deals")
      .select("*, freelancer:user_profiles!deals_freelancer_user_id_profile_fkey(stripe_connected_account_id, stripe_onboarding_complete, email), client:user_profiles!deals_client_user_id_profile_fkey(email)")
      .eq("status", "submitted")
      .eq("escrow_status", "funded")
      .in("review_status", ["approved"])
      .not("auto_release_at", "is", null)
      .lte("auto_release_at", new Date().toISOString());

    for (const deal of expiredDeals || []) {
      const freelancer = deal.freelancer as { stripe_connected_account_id: string | null; stripe_onboarding_complete: boolean; email: string | null } | null;
      const client = deal.client as { email: string | null } | null;

      // Determine Stripe destination: registered freelancer or guest freelancer
      let stripeAccountId: string | null = null;
      let freelancerEmail: string | null = null;
      let isGuestFreelancer = false;

      if (freelancer?.stripe_connected_account_id && freelancer.stripe_onboarding_complete) {
        stripeAccountId = freelancer.stripe_connected_account_id;
        freelancerEmail = freelancer.email;
      } else if (!deal.freelancer_user_id && deal.guest_freelancer_email && deal.guest_freelancer_stripe_account_id) {
        // Guest freelancer with Stripe connected
        stripeAccountId = deal.guest_freelancer_stripe_account_id;
        freelancerEmail = deal.guest_freelancer_email;
        isGuestFreelancer = true;
      }

      if (!stripeAccountId) {
        // Can't release — notify freelancer to connect Stripe
        console.warn(`[auto-release] Deal ${deal.id}: freelancer not connected to Stripe`);
        continue;
      }

      // Idempotency: use optimistic update
      const { data: updated, error: updateErr } = await supabase
        .from("deals")
        .update({ status: "completed", escrow_status: "fully_released", completed_at: new Date().toISOString(), auto_release_at: null })
        .eq("id", deal.id)
        .eq("status", "submitted") // Prevents double-release race condition
        .select("id")
        .maybeSingle();

      if (updateErr || !updated) continue; // Another process already handled this

      // Stripe Transfer
      try {
        await stripe.transfers.create({
          amount: deal.total_amount,
          currency: "usd",
          destination: stripeAccountId,
          metadata: { deal_id: deal.id, reason: "auto_release" },
        });
      } catch (transferErr) {
        console.error(`[auto-release] Stripe transfer failed for deal ${deal.id}:`, transferErr);
        // Revert the deal status since transfer failed
        await supabase.from("deals").update({ status: "submitted", escrow_status: "funded", completed_at: null, auto_release_at: deal.auto_release_at }).eq("id", deal.id);
        continue;
      }

      await supabase.from("deal_activity_log").insert({ deal_id: deal.id, user_id: null, entry_type: "system", content: "72-hour review period expired — funds auto-released to freelancer" });

      // Increment completed_deals_count for both (only for registered users)
      const { data: cd } = await supabase.from("user_profiles").select("completed_deals_count").eq("id", deal.client_user_id).maybeSingle();
      if (cd) await supabase.from("user_profiles").update({ completed_deals_count: (cd.completed_deals_count || 0) + 1 }).eq("id", deal.client_user_id);
      if (deal.freelancer_user_id) {
        const { data: fd } = await supabase.from("user_profiles").select("completed_deals_count").eq("id", deal.freelancer_user_id).maybeSingle();
        if (fd) await supabase.from("user_profiles").update({ completed_deals_count: (fd.completed_deals_count || 0) + 1 }).eq("id", deal.freelancer_user_id);
      }

      // Credit referral commission (if client was referred)
      try {
        await calculateReferralCommission(deal.id);
      } catch (err) {
        console.error("[auto-release] Referral commission failed for deal:", deal.id, err);
      }

      // Emails
      if (freelancerEmail) {
        await sendAndLogNotification({
          supabase,
          type: "auto_release_completed",
          userId: deal.freelancer_user_id || "guest",
          dealId: deal.id,
          email: freelancerEmail,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            amount: deal.total_amount,
            role: "freelancer",
          },
        });
      }
      if (client?.email) {
        await sendAndLogNotification({
          supabase,
          type: "auto_release_completed",
          userId: deal.client_user_id,
          dealId: deal.id,
          email: client.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            amount: deal.total_amount,
            role: "client",
          },
        });
      }

      dealsReleased++;
    }

    // ── Auto-release milestones ──
    const { data: expiredMilestones } = await supabase
      .from("milestones")
      .select("*, deal:deals!inner(id, title, deal_link_slug, client_user_id, freelancer_user_id)")
      .eq("status", "submitted")
      .not("auto_release_at", "is", null)
      .lte("auto_release_at", new Date().toISOString());

    // Safety: re-check deal isn't disputed before releasing milestone
    for (const milestone of expiredMilestones || []) {
      const deal = milestone.deal as { id: string; title: string; deal_link_slug: string; client_user_id: string; freelancer_user_id: string };

      // Re-check deal status to prevent race with dispute opening
      const { data: currentDeal } = await supabase
        .from("deals")
        .select("status, escrow_status, review_status")
        .eq("id", deal.id)
        .maybeSingle();
      if (!currentDeal || currentDeal.status === "disputed" || currentDeal.escrow_status === "frozen") {
        continue;
      }

      // Moderation guard: skip deals not yet approved
      if (currentDeal.review_status && currentDeal.review_status !== "approved") {
        continue;
      }

      const { data: freelancer } = await supabase.from("user_profiles").select("stripe_connected_account_id, stripe_onboarding_complete, email").eq("id", deal.freelancer_user_id).maybeSingle();
      if (!freelancer?.stripe_connected_account_id || !freelancer.stripe_onboarding_complete) continue;

      // Idempotency
      const { data: updated } = await supabase
        .from("milestones")
        .update({ status: "released", released_at: new Date().toISOString(), auto_release_at: null })
        .eq("id", milestone.id)
        .eq("status", "submitted")
        .select("id")
        .maybeSingle();

      if (!updated) continue;

      try {
        await stripe.transfers.create({
          amount: milestone.amount,
          currency: "usd",
          destination: freelancer.stripe_connected_account_id,
          metadata: { deal_id: deal.id, milestone_id: milestone.id, reason: "auto_release" },
        });
      } catch (transferErr) {
        console.error(`[auto-release] Milestone transfer failed for ${milestone.id}:`, transferErr);
        await supabase.from("milestones").update({ status: "submitted", released_at: null, auto_release_at: milestone.auto_release_at }).eq("id", milestone.id);
        continue;
      }

      await supabase.from("deal_activity_log").insert({ deal_id: deal.id, user_id: null, entry_type: "system", milestone_id: milestone.id, content: `Milestone "${milestone.title}" auto-released — $${(milestone.amount / 100).toFixed(2)} sent to freelancer` });

      // Check if all milestones now released
      const { data: allMs } = await supabase.from("milestones").select("status").eq("deal_id", deal.id);
      const allReleased = allMs?.every(m => m.status === "released") ?? false;
      if (allReleased) {
        await supabase.from("deals").update({ status: "completed", escrow_status: "fully_released", completed_at: new Date().toISOString() }).eq("id", deal.id);

        // Increment counts
        const { data: cd } = await supabase.from("user_profiles").select("completed_deals_count").eq("id", deal.client_user_id).maybeSingle();
        const { data: fd } = await supabase.from("user_profiles").select("completed_deals_count").eq("id", deal.freelancer_user_id).maybeSingle();
        if (cd) await supabase.from("user_profiles").update({ completed_deals_count: (cd.completed_deals_count || 0) + 1 }).eq("id", deal.client_user_id);
        if (fd) await supabase.from("user_profiles").update({ completed_deals_count: (fd.completed_deals_count || 0) + 1 }).eq("id", deal.freelancer_user_id);

        // Credit referral commission (if client was referred)
        try {
          await calculateReferralCommission(deal.id);
        } catch (err) {
          console.error("[auto-release] Referral commission failed for deal:", deal.id, err);
        }
      } else {
        await supabase.from("deals").update({ escrow_status: "partially_released" }).eq("id", deal.id);
      }

      milestonesReleased++;
    }
  } catch (err) {
    console.error("[auto-release] Cron error:", err);
    return NextResponse.json({ ok: false, error: "Cron execution error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deals_released: dealsReleased, milestones_released: milestonesReleased });
}
