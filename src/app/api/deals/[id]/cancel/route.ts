import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { sendAndLogNotification } from "@/lib/email/logNotification";

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

    // State 5 — Terminal states: cannot cancel
    const terminalStatuses = ["submitted", "disputed", "completed", "refunded", "cancelled"];
    if (terminalStatuses.includes(deal.status)) {
      return NextResponse.json(
        { ok: false, code: "CANNOT_CANCEL", message: "This gig cannot be cancelled in its current state." },
        { status: 400 }
      );
    }

    const hasFreelancer = deal.freelancer_user_id !== null || deal.guest_freelancer_email !== null;

    // State 1 — Unfunded, no freelancer
    if (deal.escrow_status === "unfunded") {
      if (!isClient) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can cancel an unfunded gig" }, { status: 403 });

      await serviceClient.from("deals").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
      await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `Gig cancelled by ${displayName}` });

      // Notify freelancer if assigned
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

    // State 2 — Funded, no freelancer
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

    // State 3 — Funded, freelancer accepted, NO evidence uploaded
    if (deal.escrow_status === "funded" && hasFreelancer) {
      const { data: evidenceEntries } = await serviceClient
        .from("deal_activity_log")
        .select("id")
        .eq("deal_id", id)
        .eq("is_submission_evidence", true)
        .limit(1);

      // State 4 — Evidence EXISTS
      if (evidenceEntries && evidenceEntries.length > 0) {
        return NextResponse.json(
          { ok: false, code: "EVIDENCE_EXISTS", message: "This gig has work evidence. Use the dispute process to resolve disagreements." },
          { status: 400 }
        );
      }

      // No evidence — client can cancel
      if (!isClient) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can cancel when no work evidence has been submitted" }, { status: 403 });

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
