import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helper: get client or freelancer email from a deal
async function getDealPartyEmail(
  supabase: ReturnType<typeof createServiceClient>,
  deal: { client_user_id: string; freelancer_user_id: string | null; guest_freelancer_email: string | null },
  party: "client" | "freelancer"
): Promise<{ email: string | null; userId: string }> {
  if (party === "client") {
    const { data } = await supabase.from("user_profiles").select("email").eq("id", deal.client_user_id).maybeSingle();
    return { email: data?.email || null, userId: deal.client_user_id };
  }
  if (deal.freelancer_user_id) {
    const { data } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
    return { email: data?.email || null, userId: deal.freelancer_user_id };
  }
  return { email: deal.guest_freelancer_email || null, userId: "guest" };
}

// Helper: get admin emails for critical alerts
async function getAdminEmails(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const { data } = await supabase.from("user_profiles").select("email").eq("is_platform_admin", true);
  return (data || []).map((u) => u.email).filter(Boolean) as string[];
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: any;
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
      // ════════════════════════════════════════════════════════════════
      // 1. CHECKOUT COMPLETED — Escrow funded
      // ════════════════════════════════════════════════════════════════
      case "checkout.session.completed": {
        const session = event.data.object;
        const dealId = session.metadata?.deal_id;
        const milestoneId = session.metadata?.milestone_id;
        const escrowAmount = parseInt(session.metadata?.escrow_amount || "0", 10);
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;

        if (!dealId) break;

        const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
        if (!deal) break;

        if (milestoneId === "all") {
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
            .eq("escrow_status", "unfunded");

          await supabase.from("deal_activity_log").insert({
            deal_id: dealId, user_id: null, entry_type: "system",
            content: `All milestones funded — $${(escrowAmount / 100).toFixed(2)} secured in escrow`,
          });

        } else if (milestoneId && milestoneId !== "") {
          const { data: milestone } = await supabase.from("milestones").select("*").eq("id", milestoneId).maybeSingle();
          if (!milestone || milestone.status !== "pending_funding") break;

          await supabase
            .from("milestones")
            .update({ status: "funded", funded_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
            .eq("id", milestoneId)
            .eq("status", "pending_funding");

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

          if (deal.freelancer_user_id) {
            const { data: freelancer } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
            if (freelancer?.email) {
              await sendAndLogNotification({
                supabase, type: "milestone_funded", userId: deal.freelancer_user_id, dealId,
                email: freelancer.email,
                data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, milestoneTitle: milestone.title, amount: milestone.amount },
              });
            }
          }

        } else {
          if (deal.escrow_status !== "unfunded") break;

          await supabase
            .from("deals")
            .update({
              escrow_status: "funded",
              status: deal.freelancer_user_id ? "in_progress" : deal.status,
              funded_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", dealId)
            .eq("escrow_status", "unfunded");

          await supabase.from("deal_activity_log").insert({
            deal_id: dealId, user_id: null, entry_type: "system",
            content: `Escrow funded — $${(escrowAmount / 100).toFixed(2)} secured`,
          });
        }

        // Set expires_at (30 days from funding)
        const fundedAt = deal.funded_at || new Date().toISOString();
        const expiresAt = new Date(new Date(fundedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("deals").update({ expires_at: expiresAt }).eq("id", dealId);

        // Email freelancer about escrow funding (non-milestone or fund-all)
        if (!milestoneId || milestoneId === "" || milestoneId === "all") {
          const hasFreelancer = deal.freelancer_user_id || deal.guest_freelancer_email;
          if (hasFreelancer) {
            if (deal.freelancer_user_id) {
              const { data: freelancer } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
              if (freelancer?.email) {
                await sendAndLogNotification({
                  supabase, type: "escrow_funded_after_accept", userId: deal.freelancer_user_id, dealId,
                  email: freelancer.email,
                  data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: escrowAmount },
                });
              }
            } else if (deal.guest_freelancer_email) {
              await sendAndLogNotification({
                supabase, type: "escrow_funded_after_accept", userId: "guest", dealId,
                email: deal.guest_freelancer_email,
                data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, amount: escrowAmount },
              });
            }
          }
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 2. CHECKOUT EXPIRED — Client abandoned payment
      // ════════════════════════════════════════════════════════════════
      case "checkout.session.expired": {
        const session = event.data.object;
        const dealId = session.metadata?.deal_id;
        if (!dealId) break;

        const { data: deal } = await supabase.from("deals").select("id, title, deal_link_slug, client_user_id").eq("id", dealId).maybeSingle();
        if (!deal) break;

        await supabase.from("deal_activity_log").insert({
          deal_id: dealId, user_id: null, entry_type: "system",
          content: "Checkout session expired — payment not completed",
        });

        const client = await getDealPartyEmail(supabase, { ...deal, freelancer_user_id: null, guest_freelancer_email: null }, "client");
        if (client.email) {
          await sendAndLogNotification({
            supabase, type: "checkout_expired", userId: client.userId, dealId,
            email: client.email,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug },
          });
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 3. ASYNC PAYMENT FAILED — Bank transfer bounced days later
      // ════════════════════════════════════════════════════════════════
      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        const dealId = session.metadata?.deal_id;
        if (!dealId) break;

        const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
        if (!deal) break;

        // Revert escrow status — the money never actually arrived
        if (deal.escrow_status === "funded") {
          await supabase.from("deals").update({ escrow_status: "unfunded", status: "pending_acceptance" }).eq("id", dealId);
        }

        await supabase.from("deal_activity_log").insert({
          deal_id: dealId, user_id: null, entry_type: "system",
          content: "Bank transfer failed — escrow reverted to unfunded",
        });

        const client = await getDealPartyEmail(supabase, deal, "client");
        if (client.email) {
          await sendAndLogNotification({
            supabase, type: "payment_failed_async", userId: client.userId, dealId,
            email: client.email,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, failureReason: "bank transfer was declined" },
          });
        }

        // Alert admins
        const admins = await getAdminEmails(supabase);
        for (const adminEmail of admins) {
          await sendAndLogNotification({
            supabase, type: "payment_failed_async", userId: "admin", dealId,
            email: adminEmail,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, failureReason: "bank transfer was declined — admin alert" },
          });
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 4. CONNECT ACCOUNT UPDATED — Freelancer completed onboarding
      // ════════════════════════════════════════════════════════════════
      case "account.updated": {
        const account = event.data.object;
        if (account.details_submitted && account.charges_enabled) {
          await supabase
            .from("user_profiles")
            .update({ stripe_onboarding_complete: true })
            .eq("stripe_connected_account_id", account.id);
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 5. CHARGE REFUNDED — Refund processed
      // ════════════════════════════════════════════════════════════════
      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (paymentIntentId) {
          const { data: deal } = await supabase.from("deals").select("id, deal_link_slug, title, status, escrow_status").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
          if (deal) {
            await supabase.from("deals").update({ escrow_status: "refunded", status: "refunded" }).eq("id", deal.id).not("status", "in", "(completed,disputed)");
            await supabase.from("deal_activity_log").insert({ deal_id: deal.id, user_id: null, entry_type: "system", content: "Refund processed by Stripe" });
          }
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 6. CHARGEBACK OPENED — Client's bank disputed the charge
      // ════════════════════════════════════════════════════════════════
      case "charge.dispute.created": {
        const dispute = event.data.object;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id || null;
        if (!chargeId) break;

        // Look up the charge to find the payment intent, then the deal
        let paymentIntentId: string | null = null;
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        } catch {
          console.error("[webhook] Could not retrieve charge for dispute:", chargeId);
          break;
        }

        if (!paymentIntentId) break;

        const { data: deal } = await supabase.from("deals").select("*").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
        if (!deal) break;

        // Freeze the deal — funds are now held by the bank
        await supabase.from("deals").update({ escrow_status: "frozen", flagged_for_review: true, flagged_reason: "Chargeback filed by client's bank" }).eq("id", deal.id);

        await supabase.from("deal_activity_log").insert({
          deal_id: deal.id, user_id: null, entry_type: "system",
          content: `Chargeback filed — $${(dispute.amount / 100).toFixed(2)} frozen by bank`,
        });

        // Alert admins immediately
        const admins = await getAdminEmails(supabase);
        for (const adminEmail of admins) {
          await sendAndLogNotification({
            supabase, type: "chargeback_opened", userId: "admin", dealId: deal.id,
            email: adminEmail,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, chargebackAmount: dispute.amount },
          });
        }

        // Notify the freelancer that funds are frozen
        if (deal.freelancer_user_id || deal.guest_freelancer_email) {
          const freelancer = await getDealPartyEmail(supabase, deal, "freelancer");
          if (freelancer.email) {
            await sendAndLogNotification({
              supabase, type: "chargeback_opened", userId: freelancer.userId, dealId: deal.id,
              email: freelancer.email,
              data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, chargebackAmount: dispute.amount },
            });
          }
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 7. CHARGEBACK CLOSED — Bank resolved the dispute
      // ════════════════════════════════════════════════════════════════
      case "charge.dispute.closed": {
        const dispute = event.data.object;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id || null;
        if (!chargeId) break;

        let paymentIntentId: string | null = null;
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        } catch {
          break;
        }

        if (!paymentIntentId) break;

        const { data: deal } = await supabase.from("deals").select("*").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
        if (!deal) break;

        // dispute.status is "won" (merchant won) or "lost" (merchant lost)
        const won = dispute.status === "won";

        if (won) {
          // Funds returned — unfreeze the deal
          await supabase.from("deals").update({ escrow_status: "funded", flagged_for_review: false, flagged_reason: null }).eq("id", deal.id);
        } else {
          // Funds gone — mark deal as refunded
          await supabase.from("deals").update({ escrow_status: "refunded", status: "refunded", flagged_for_review: false }).eq("id", deal.id);
        }

        const statusText = won ? "Chargeback resolved — funds returned to escrow" : "Chargeback lost — funds removed by bank";
        await supabase.from("deal_activity_log").insert({ deal_id: deal.id, user_id: null, entry_type: "system", content: statusText });

        // Notify admins
        const admins = await getAdminEmails(supabase);
        for (const adminEmail of admins) {
          await sendAndLogNotification({
            supabase, type: "chargeback_closed", userId: "admin", dealId: deal.id,
            email: adminEmail,
            data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, chargebackStatus: won ? "won" : "lost" },
          });
        }

        // Notify freelancer
        if (deal.freelancer_user_id || deal.guest_freelancer_email) {
          const freelancer = await getDealPartyEmail(supabase, deal, "freelancer");
          if (freelancer.email) {
            await sendAndLogNotification({
              supabase, type: "chargeback_closed", userId: freelancer.userId, dealId: deal.id,
              email: freelancer.email,
              data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, chargebackStatus: won ? "won" : "lost" },
            });
          }
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 8. TRANSFER FAILED — Platform → freelancer transfer failed
      // ════════════════════════════════════════════════════════════════
      case "transfer.failed": {
        const transfer = event.data.object;
        const dealId = transfer.metadata?.deal_id;

        console.error("[webhook] Transfer failed:", transfer.id, transfer.destination);

        if (dealId) {
          const { data: deal } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
          if (deal) {
            await supabase.from("deal_activity_log").insert({
              deal_id: dealId, user_id: null, entry_type: "system",
              content: `Transfer to freelancer failed — payout delayed`,
            });

            // Notify freelancer
            const freelancer = await getDealPartyEmail(supabase, deal, "freelancer");
            if (freelancer.email) {
              await sendAndLogNotification({
                supabase, type: "transfer_failed", userId: freelancer.userId, dealId,
                email: freelancer.email,
                data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug, failureReason: "transfer to your account could not be completed", transferId: transfer.id },
              });
            }
          }
        }

        // Always alert admins on transfer failure
        const admins = await getAdminEmails(supabase);
        for (const adminEmail of admins) {
          await sendAndLogNotification({
            supabase, type: "transfer_failed", userId: "admin", dealId: dealId || "unknown",
            email: adminEmail,
            data: { dealTitle: dealId ? "See deal" : "Unknown deal", dealSlug: "", failureReason: `Transfer ${transfer.id} failed to ${transfer.destination}`, transferId: transfer.id },
          });
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 9. PAYOUT FAILED — Freelancer's bank rejected payout
      // ════════════════════════════════════════════════════════════════
      case "payout.failed": {
        const payout = event.data.object;
        const connectedAccountId = event.account; // Connected account ID from the event
        const failureMessage = payout.failure_message || "bank rejected the payout";

        console.error("[webhook] Payout failed:", payout.id, failureMessage);

        // Find the freelancer by connected account ID
        if (connectedAccountId) {
          const { data: profile } = await supabase.from("user_profiles").select("id, email, display_name").eq("stripe_connected_account_id", connectedAccountId).maybeSingle();
          if (profile?.email) {
            // We don't have a specific deal ID from payout events, so use a general notification
            await sendAndLogNotification({
              supabase, type: "transfer_failed", userId: profile.id, dealId: "payout",
              email: profile.email,
              data: { dealTitle: "your recent gig", dealSlug: "", failureReason: failureMessage, payoutId: payout.id },
            });
          }
        }

        // Alert admins
        const admins = await getAdminEmails(supabase);
        for (const adminEmail of admins) {
          await sendAndLogNotification({
            supabase, type: "transfer_failed", userId: "admin", dealId: "payout",
            email: adminEmail,
            data: { dealTitle: "Payout failure", dealSlug: "", failureReason: `Payout ${payout.id} failed: ${failureMessage}`, payoutId: payout.id },
          });
        }
        break;
      }

      // ════════════════════════════════════════════════════════════════
      // 10. PAYOUT PAID — Freelancer's money landed in their bank
      // ════════════════════════════════════════════════════════════════
      case "payout.paid": {
        const payout = event.data.object;
        const connectedAccountId = event.account;

        if (connectedAccountId) {
          const { data: profile } = await supabase.from("user_profiles").select("id, email").eq("stripe_connected_account_id", connectedAccountId).maybeSingle();
          if (profile?.email) {
            await sendAndLogNotification({
              supabase, type: "payout_landed", userId: profile.id, dealId: "payout",
              email: profile.email,
              data: { dealTitle: "your recent gig", dealSlug: "", amount: payout.amount, payoutId: payout.id },
            });
          }
        }
        break;
      }

      default:
        // Return 200 for unhandled events — Stripe expects this
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error processing ${event.type}:`, err);
    // Return 200 anyway to avoid Stripe retries on our errors
  }

  return NextResponse.json({ received: true });
}
