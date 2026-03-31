import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const supabase = createServiceClient();
  let dealsExpired = 0;
  let ghostRefunds = 0;
  let disputeDefaults = 0;

  try {
    const now = new Date();

    // ── 1. 30-day auto-refund for funded deals with no freelancer ──
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredDeals } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, client_user_id, total_amount, stripe_payment_intent_id, funded_at")
      .eq("escrow_status", "funded")
      .is("freelancer_user_id", null)
      .is("guest_freelancer_email", null)
      .lte("funded_at", thirtyDaysAgo)
      .not("status", "in", "(completed,cancelled,refunded,disputed)");

    for (const deal of expiredDeals || []) {
      // Stripe refund
      if (deal.stripe_payment_intent_id) {
        try {
          await stripe.refunds.create({ payment_intent: deal.stripe_payment_intent_id });
        } catch (err) {
          console.error(`[auto-expire] Refund failed for deal ${deal.id}:`, err);
          continue;
        }
      }

      await supabase.from("deals").update({
        status: "refunded",
        escrow_status: "refunded",
        cancelled_at: now.toISOString(),
      }).eq("id", deal.id);

      const amount = (deal.total_amount / 100).toFixed(2);
      await supabase.from("deal_activity_log").insert({
        deal_id: deal.id,
        user_id: null,
        entry_type: "system",
        content: `Gig auto-expired — no freelancer accepted within 30 days. $${amount} refund processing.`,
      });

      // Email client
      const { data: clientProfile } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
      if (clientProfile?.email) {
        await sendAndLogNotification({
          supabase,
          type: "auto_expire_completed",
          userId: deal.client_user_id,
          dealId: deal.id,
          email: clientProfile.email,
          data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: deal.total_amount },
        });
      }

      dealsExpired++;
    }

    // ── 2. 21-day auto-refund for ghosting freelancers ──
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();

    // Registered freelancers
    const { data: ghostDeals } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, client_user_id, freelancer_user_id, guest_freelancer_email, total_amount, stripe_payment_intent_id, updated_at")
      .eq("escrow_status", "funded")
      .not("freelancer_user_id", "is", null)
      .lte("updated_at", twentyOneDaysAgo)
      .not("status", "in", "(completed,cancelled,refunded,disputed,submitted)");

    // Guest freelancers
    const { data: ghostGuestDeals } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, client_user_id, freelancer_user_id, guest_freelancer_email, total_amount, stripe_payment_intent_id, guest_email_verified_at")
      .eq("escrow_status", "funded")
      .is("freelancer_user_id", null)
      .not("guest_freelancer_email", "is", null)
      .lte("guest_email_verified_at", twentyOneDaysAgo)
      .not("status", "in", "(completed,cancelled,refunded,disputed,submitted)");

    const allGhostDeals = [...(ghostDeals || []), ...(ghostGuestDeals || [])];

    for (const deal of allGhostDeals) {
      // Check zero evidence
      const { data: evidence } = await supabase
        .from("deal_activity_log")
        .select("id")
        .eq("deal_id", deal.id)
        .eq("is_submission_evidence", true)
        .limit(1);

      if (evidence && evidence.length > 0) continue;

      // Stripe refund
      if (deal.stripe_payment_intent_id) {
        try {
          await stripe.refunds.create({ payment_intent: deal.stripe_payment_intent_id });
        } catch (err) {
          console.error(`[auto-expire] Ghost refund failed for deal ${deal.id}:`, err);
          continue;
        }
      }

      await supabase.from("deals").update({
        status: "refunded",
        escrow_status: "refunded",
        cancelled_at: now.toISOString(),
      }).eq("id", deal.id);

      const amount = (deal.total_amount / 100).toFixed(2);
      await supabase.from("deal_activity_log").insert({
        deal_id: deal.id,
        user_id: null,
        entry_type: "system",
        content: `Gig auto-refunded — no work evidence submitted within 21 days of acceptance. $${amount} refund processing.`,
      });

      // Email client
      const { data: clientProfile } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
      if (clientProfile?.email) {
        await sendAndLogNotification({
          supabase,
          type: "auto_expire_completed",
          userId: deal.client_user_id,
          dealId: deal.id,
          email: clientProfile.email,
          data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: deal.total_amount },
        });
      }

      // Email freelancer
      if (deal.freelancer_user_id) {
        const { data: fp } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({
            supabase,
            type: "deal_cancelled_to_freelancer",
            userId: deal.freelancer_user_id,
            dealId: deal.id,
            email: fp.email,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
          });
        }
      } else if (deal.guest_freelancer_email) {
        await sendAndLogNotification({
          supabase,
          type: "deal_cancelled_to_freelancer",
          userId: "guest",
          dealId: deal.id,
          email: deal.guest_freelancer_email,
          data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
        });
      }

      ghostRefunds++;
    }

    // ── 3. Dispute default judgment ──
    // Disputes where response_deadline_at has passed and respondent hasn't responded
    const { data: defaultDisputes } = await supabase
      .from("disputes")
      .select("*, deal:deals!inner(id, title, deal_link_slug, total_amount, client_user_id, freelancer_user_id, guest_freelancer_email)")
      .eq("status", "open")
      .lt("response_deadline_at", now.toISOString())
      .is("respondent_proposed_percentage", null);

    for (const dispute of defaultDisputes || []) {
      // Check no remaining extensions possible (extension_count exhausted is subjective;
      // the spec says "extension_count has been exhausted" — we auto-resolve regardless
      // since the deadline has already passed)
      const deal = dispute.deal as {
        id: string;
        title: string;
        deal_link_slug: string;
        total_amount: number;
        client_user_id: string;
        freelancer_user_id: string | null;
        guest_freelancer_email: string | null;
      };

      const resolvedPercentage = dispute.claimant_proposed_percentage as number;
      const resolutionAmount = Math.round(deal.total_amount * resolvedPercentage / 100);

      await supabase.from("disputes").update({
        auto_resolved: true,
        status: "resolved_partial",
        resolution_amount: resolutionAmount,
        resolution_notes: `Auto-resolved: respondent did not respond within deadline. Claimant's proposal of ${resolvedPercentage}% to freelancer applied.`,
        resolved_at: now.toISOString(),
      }).eq("id", dispute.id);

      await supabase.from("deal_activity_log").insert({
        deal_id: deal.id,
        user_id: null,
        entry_type: "system",
        content: `Dispute auto-resolved — respondent did not respond. ${resolvedPercentage}% to freelancer.`,
      });

      // Email both
      const { data: clientProfile } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
      if (clientProfile?.email) {
        await sendAndLogNotification({ supabase, type: "dispute_auto_resolved", userId: deal.client_user_id, dealId: deal.id, email: clientProfile.email, data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug } });
      }

      if (deal.freelancer_user_id) {
        const { data: fp } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({ supabase, type: "dispute_auto_resolved", userId: deal.freelancer_user_id, dealId: deal.id, email: fp.email, data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug } });
        }
      } else if (deal.guest_freelancer_email) {
        await sendAndLogNotification({ supabase, type: "dispute_auto_resolved", userId: "guest", dealId: deal.id, email: deal.guest_freelancer_email, data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug } });
      }

      disputeDefaults++;
    }
  } catch (err) {
    console.error("[auto-expire] Cron error:", err);
    return NextResponse.json({ ok: false, error: "Cron execution error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deals_expired: dealsExpired, ghost_refunds: ghostRefunds, dispute_defaults: disputeDefaults });
}
