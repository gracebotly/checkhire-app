import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const { data: deal } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    if (!deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });

    const isClient = deal.client_user_id === user.id;
    const isFreelancer = deal.freelancer_user_id === user.id;
    if (!isClient && !isFreelancer) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not a participant" }, { status: 403 });

    const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = profile?.display_name || "Unknown";

    // Case 1: Unfunded deal — either party can cancel
    if (deal.escrow_status === "unfunded") {
      await supabase.from("deals").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `Gig cancelled by ${displayName}` });
      return NextResponse.json({ ok: true });
    }

    // Case 2: Funded but no work started — client can cancel for refund, or freelancer can withdraw for refund
    if (deal.escrow_status === "funded" && deal.status === "funded") {
      // Only refund if we have a payment intent
      if (deal.stripe_payment_intent_id) {
        const stripe = getStripe();
        await stripe.refunds.create({ payment_intent: deal.stripe_payment_intent_id });
      }

      await supabase.from("deals").update({ status: "refunded", escrow_status: "refunded", cancelled_at: new Date().toISOString() }).eq("id", id);
      const action = isClient ? "cancelled" : "withdrew from";
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} ${action} the gig — full refund issued` });
      return NextResponse.json({ ok: true });
    }

    // Case 3: Work in progress or submitted — cannot cancel, must dispute
    return NextResponse.json({ ok: false, code: "CANNOT_CANCEL", message: "Work is in progress. To cancel at this stage, open a dispute." }, { status: 400 });
  }
);
