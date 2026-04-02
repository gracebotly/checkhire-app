import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { sendAndLogNotification } from "@/lib/email/logNotification";

/** 24 hours in milliseconds */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: deal } = await serviceClient.from("deals").select("*").eq("id", id).maybeSingle();
    if (!deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });

    const isClient = deal.client_user_id === user.id;
    const isFreelancer = deal.freelancer_user_id === user.id;
    if (!isClient && !isFreelancer) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not a participant" }, { status: 403 });

    const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = profile?.display_name || "Unknown";

    // Terminal states: cannot cancel
    const terminalStatuses = ["submitted", "disputed", "completed", "refunded", "cancelled"];
    if (terminalStatuses.includes(deal.status)) {
      return NextResponse.json(
        { ok: false, code: "CANNOT_CANCEL", message: "This gig cannot be cancelled in its current state." },
        { status: 400 }
      );
    }

    const hasFreelancer = deal.freelancer_user_id !== null || deal.guest_freelancer_email !== null;

    // State 1 — Unfunded, no freelancer: free cancel
    if (deal.escrow_status === "unfunded" && !hasFreelancer) {
      if (!isClient) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can cancel an unfunded gig" }, { status: 403 });

      await serviceClient.from("deals").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
      await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `Gig cancelled by ${displayName}` });

      return NextResponse.json({ ok: true });
    }

    // State 1b — Unfunded, freelancer accepted: client can still cancel (no money at stake)
    if (deal.escrow_status === "unfunded" && hasFreelancer) {
      if (!isClient) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can cancel an unfunded gig" }, { status: 403 });

      await serviceClient.from("deals").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
      await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `Gig cancelled by ${displayName}` });

      // Notify freelancer
      if (deal.freelancer_user_id) {
        const { data: fp } = await serviceClient.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({ supabase: serviceClient, type: "deal_cancelled_to_freelancer", userId: deal.freelancer_user_id, dealId: id, email: fp.email, data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug } });
        }
      } else if (deal.guest_freelancer_email) {
        await sendAndLogNotification({ supabase: serviceClient, type: "deal_cancelled_to_freelancer", userId: "guest", dealId: id, email: deal.guest_freelancer_email, data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug } });
      }

      return NextResponse.json({ ok: true });
    }

    // State 2 — Funded, no freelancer: full refund
    if (deal.escrow_status === "funded" && !hasFreelancer) {
      if (!isClient) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can cancel" }, { status: 403 });

      if (deal.stripe_payment_intent_id) {
        const stripe = getStripe();
        await stripe.refunds.create({ payment_intent: deal.stripe_payment_intent_id });
      }

      await serviceClient.from("deals").update({ status: "refunded", escrow_status: "refunded", cancelled_at: new Date().toISOString() }).eq("id", id);
      const amount = (deal.total_amount / 100).toFixed(2);
      await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `Gig cancelled — $${amount} refund processing` });

      return NextResponse.json({ ok: true });
    }

    // State 3 — Funded, freelancer accepted
    if (deal.escrow_status === "funded" && hasFreelancer) {
      if (!isClient) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can cancel" }, { status: 403 });

      // Check for evidence — if evidence exists, must use dispute flow
      const { data: evidenceEntries } = await serviceClient
        .from("deal_activity_log")
        .select("id")
        .eq("deal_id", id)
        .eq("is_submission_evidence", true)
        .limit(1);

      if (evidenceEntries && evidenceEntries.length > 0) {
        return NextResponse.json(
          { ok: false, code: "EVIDENCE_EXISTS", message: "This gig has work evidence. Use the dispute process to resolve disagreements." },
          { status: 400 }
        );
      }

      // ── GRACE PERIOD CHECK ──
      // After a freelancer accepts a funded gig, the client has 24 hours to cancel.
      // After that, the escrow is locked and the client must use the dispute process.
      const acceptedAt = deal.accepted_at ? new Date(deal.accepted_at) : null;

      if (acceptedAt) {
        const gracePeriodEnd = new Date(acceptedAt.getTime() + GRACE_PERIOD_MS);
        const now = new Date();

        if (now > gracePeriodEnd) {
          // Grace period expired — escrow is locked
          const hoursAgo = Math.floor((now.getTime() - acceptedAt.getTime()) / (1000 * 60 * 60));
          return NextResponse.json(
            {
              ok: false,
              code: "ESCROW_LOCKED",
              message: `Escrow is locked — the freelancer accepted ${hoursAgo} hours ago. The 24-hour cancellation window has passed. If there's a problem with this gig, please open a dispute instead.`,
            },
            { status: 400 }
          );
        }
      }
      // If accepted_at is null (legacy deal), allow cancellation (backwards compatible)

      // Within grace period (or no accepted_at) — proceed with refund
      if (deal.stripe_payment_intent_id) {
        const stripe = getStripe();
        await stripe.refunds.create({ payment_intent: deal.stripe_payment_intent_id });
      }

      await serviceClient.from("deals").update({ status: "refunded", escrow_status: "refunded", cancelled_at: new Date().toISOString() }).eq("id", id);
      const amount = (deal.total_amount / 100).toFixed(2);
      await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `Gig cancelled — no work evidence submitted. $${amount} refund processing.` });

      // Notify freelancer
      if (deal.freelancer_user_id) {
        const { data: fp } = await serviceClient.from("user_profiles").select("email").eq("id", deal.freelancer_user_id).maybeSingle();
        if (fp?.email) {
          await sendAndLogNotification({ supabase: serviceClient, type: "deal_cancelled_to_freelancer", userId: deal.freelancer_user_id, dealId: id, email: fp.email, data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug } });
        }
      } else if (deal.guest_freelancer_email) {
        await sendAndLogNotification({ supabase: serviceClient, type: "deal_cancelled_to_freelancer", userId: "guest", dealId: id, email: deal.guest_freelancer_email, data: { dealTitle: deal.title, dealSlug: deal.deal_link_slug } });
      }

      return NextResponse.json({ ok: true });
    }

    // Fallback
    return NextResponse.json({ ok: false, code: "CANNOT_CANCEL", message: "This gig cannot be cancelled in its current state." }, { status: 400 });
  }
);
