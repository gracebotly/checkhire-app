import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEscrowFundedEmail, sendMilestoneFundedEmail } from "@/lib/email/escrow-notifications";

export const runtime = "nodejs";

// Disable Next.js body parsing — we need the raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event;
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Signature verification failed:", message);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const dealId = session.metadata?.deal_id;
        const milestoneId = session.metadata?.milestone_id;
        const escrowAmount = parseInt(session.metadata?.escrow_amount || "0", 10);
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;

        if (!dealId) break;

        // Fetch the deal
        const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
        if (!deal) break;

        if (milestoneId === "all") {
          // Fund all milestones at once
          // Idempotency: only update milestones still in pending_funding
          await supabase
            .from("milestones")
            .update({ status: "funded", funded_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
            .eq("deal_id", dealId)
            .eq("status", "pending_funding");

          await supabase
            .from("deals")
            .update({
              escrow_status: "funded",
              status: deal.freelancer_user_id ? "in_progress" : deal.status,
              funded_at: deal.funded_at || new Date().toISOString(),
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", dealId)
            .eq("escrow_status", "unfunded"); // Idempotency

          await supabase.from("deal_activity_log").insert({
            deal_id: dealId, user_id: null, entry_type: "system",
            content: `All milestones funded — $${(escrowAmount / 100).toFixed(2)} secured in escrow`,
          });

        } else if (milestoneId && milestoneId !== "") {
          // Fund single milestone
          const { data: milestone } = await supabase.from("milestones").select("*").eq("id", milestoneId).maybeSingle();
          if (!milestone || milestone.status !== "pending_funding") break; // Idempotency

          await supabase
            .from("milestones")
            .update({ status: "funded", funded_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
            .eq("id", milestoneId)
            .eq("status", "pending_funding"); // Idempotency

          // Check if all milestones are now funded
          const { data: allMs } = await supabase.from("milestones").select("status").eq("deal_id", dealId);
          const allFunded = allMs?.every(m => m.status !== "pending_funding") ?? false;

          if (allFunded) {
            await supabase
              .from("deals")
              .update({
                escrow_status: "funded",
                status: deal.freelancer_user_id ? "in_progress" : deal.status,
                funded_at: deal.funded_at || new Date().toISOString(),
              })
              .eq("id", dealId);
          }

          await supabase.from("deal_activity_log").insert({
            deal_id: dealId, user_id: null, entry_type: "system",
            content: `Milestone "${milestone.title}" funded — $${(milestone.amount / 100).toFixed(2)} secured`,
          });

          // Email freelancer about milestone funding
          if (deal.freelancer_user_id) {
            const { data: freelancer } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
            if (freelancer?.email) {
              await sendMilestoneFundedEmail({ to: freelancer.email, dealTitle: deal.title, dealSlug: deal.deal_link_slug, milestoneTitle: milestone.title, amount: milestone.amount });
              await supabase.from("email_notifications").insert({ user_id: deal.freelancer_user_id, deal_id: dealId, notification_type: "milestone_funded", email_address: freelancer.email, sent_at: new Date().toISOString() });
            }
          }

        } else {
          // Fund entire deal (non-milestone)
          if (deal.escrow_status !== "unfunded") break; // Idempotency

          await supabase
            .from("deals")
            .update({
              escrow_status: "funded",
              status: deal.freelancer_user_id ? "in_progress" : deal.status,
              funded_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", dealId)
            .eq("escrow_status", "unfunded"); // Idempotency

          await supabase.from("deal_activity_log").insert({
            deal_id: dealId, user_id: null, entry_type: "system",
            content: `Escrow funded — $${(escrowAmount / 100).toFixed(2)} secured`,
          });
        }

        // Email the freelancer that escrow is funded (for non-milestone or fund-all)
        if ((!milestoneId || milestoneId === "" || milestoneId === "all") && deal.freelancer_user_id) {
          const { data: freelancer } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
          if (freelancer?.email) {
            await sendEscrowFundedEmail({ to: freelancer.email, dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: escrowAmount });
            await supabase.from("email_notifications").insert({ user_id: deal.freelancer_user_id, deal_id: dealId, notification_type: "escrow_funded", email_address: freelancer.email, sent_at: new Date().toISOString() });
          }
        }

        break;
      }

      case "account.updated": {
        // Freelancer completed Stripe Connect onboarding
        const account = event.data.object;
        if (account.details_submitted && account.charges_enabled) {
          await supabase
            .from("user_profiles")
            .update({ stripe_onboarding_complete: true })
            .eq("stripe_connected_account_id", account.id);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (paymentIntentId) {
          // Update deal that matches this payment intent to refunded status
          const { data: deal } = await supabase.from("deals").select("id, deal_link_slug, title").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
          if (deal) {
            await supabase.from("deals").update({ escrow_status: "refunded", status: "refunded" }).eq("id", deal.id).not("status", "in", "(completed,disputed)");
            await supabase.from("deal_activity_log").insert({ deal_id: deal.id, user_id: null, entry_type: "system", content: "Refund processed by Stripe" });
          }
        }
        break;
      }

      case "payout.failed": {
        // Log payout failure — the freelancer's bank rejected the payout
        const payout = event.data.object;
        console.error("[webhook] Payout failed:", payout.id, payout.failure_message);
        break;
      }

      default:
        // Return 200 for unhandled events — Stripe expects this
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error processing ${event.type}:`, err);
    // Return 200 anyway to avoid Stripe retries on our errors
    // If we return 4xx/5xx, Stripe will keep retrying the same event
  }

  return NextResponse.json({ received: true });
}
