import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const PATCH = withApiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );

    const body = await req.json();
    const action = body.action;

    // Fetch deal
    const { data: deal, error: fetchError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Fetch acting user's profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const displayName = profile?.display_name || "Unknown";

    if (action === "accept") {
      if (deal.freelancer_user_id) {
        return NextResponse.json(
          {
            ok: false,
            code: "ALREADY_ACCEPTED",
            message: "This gig already has a freelancer",
          },
          { status: 400 }
        );
      }
      if (deal.status !== "pending_acceptance") {
        return NextResponse.json(
          {
            ok: false,
            code: "INVALID_STATUS",
            message: "This gig cannot be accepted",
          },
          { status: 400 }
        );
      }
      if (deal.client_user_id === user.id) {
        return NextResponse.json(
          {
            ok: false,
            code: "SELF_ACCEPT",
            message: "You cannot accept your own gig",
          },
          { status: 400 }
        );
      }

      const { data: updatedDeal, error: updateError } = await supabase
        .from("deals")
        .update({ freelancer_user_id: user.id })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { ok: false, code: "DB_ERROR", message: updateError.message },
          { status: 500 }
        );
      }

      await supabase.from("deal_activity_log").insert({
        deal_id: id,
        user_id: null,
        entry_type: "system",
        content: `${displayName} accepted the gig`,
      });

      // Notify client that freelancer accepted
      const { data: clientProf } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", deal.client_user_id)
        .maybeSingle();

      if (clientProf?.email) {
        const serviceClient = createServiceClient();
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "deal_accepted",
          userId: deal.client_user_id,
          dealId: id,
          email: clientProf.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            otherPartyName: displayName,
          },
        });
      }

      return NextResponse.json({ ok: true, deal: updatedDeal });
    }

    if (action === "cancel") {
      if (deal.client_user_id !== user.id) {
        return NextResponse.json(
          {
            ok: false,
            code: "FORBIDDEN",
            message: "Only the client can cancel",
          },
          { status: 403 }
        );
      }
      if (
        deal.status !== "pending_acceptance" ||
        deal.escrow_status !== "unfunded"
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: "INVALID_STATUS",
            message: "This gig cannot be cancelled",
          },
          { status: 400 }
        );
      }

      const { data: updatedDeal, error: updateError } = await supabase
        .from("deals")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { ok: false, code: "DB_ERROR", message: updateError.message },
          { status: 500 }
        );
      }

      await supabase.from("deal_activity_log").insert({
        deal_id: id,
        user_id: null,
        entry_type: "system",
        content: `Gig cancelled by ${displayName}`,
      });

      // Notify freelancer if one was assigned
      if (deal.freelancer_user_id) {
        const { data: freelancerProf } = await supabase
          .from("user_profiles")
          .select("email")
          .eq("id", deal.freelancer_user_id)
          .maybeSingle();

        if (freelancerProf?.email) {
          const serviceClient = createServiceClient();
          await sendAndLogNotification({
            supabase: serviceClient,
            type: "deal_cancelled",
            userId: deal.freelancer_user_id,
            dealId: id,
            email: freelancerProf.email,
            data: {
              dealTitle: deal.title,
              dealSlug: deal.deal_link_slug,
            },
          });
        }
      }

      return NextResponse.json({ ok: true, deal: updatedDeal });
    }

    return NextResponse.json(
      { ok: false, code: "INVALID_ACTION", message: "Unknown action" },
      { status: 400 }
    );
  }
);
