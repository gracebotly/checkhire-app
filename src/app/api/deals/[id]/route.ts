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
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const displayName = profile?.display_name || "Unknown";

    // Publish a draft deal
    if (body.action === "publish_draft") {
      if (deal.status !== "draft") {
        return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Only draft deals can be published" }, { status: 400 });
      }
      if (deal.client_user_id !== user.id) {
        return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can publish" }, { status: 403 });
      }

      const updateData: Record<string, unknown> = {
        status: "pending_acceptance",
        title: body.title || deal.title,
        description: body.description || deal.description,
        deliverables: body.deliverables ?? deal.deliverables,
        total_amount: body.total_amount || deal.total_amount,
        category: body.category ?? deal.category,
        other_category_description: body.other_category_description ?? deal.other_category_description,
        payment_frequency: body.payment_frequency || deal.payment_frequency,
        deadline: body.deadline ?? deal.deadline,
        has_milestones: body.has_milestones ?? deal.has_milestones,
        description_brief_url: body.description_brief_url ?? deal.description_brief_url,
        deliverables_brief_url: body.deliverables_brief_url ?? deal.deliverables_brief_url,
        deal_type: body.deal_type || deal.deal_type,
        recipient_email:
          typeof body.recipient_email === "string" && body.recipient_email.trim()
            ? body.recipient_email.trim()
            : null,
        recipient_name:
          typeof body.recipient_name === "string" && body.recipient_name.trim()
            ? body.recipient_name.trim()
            : null,
      };

      const { data: updatedDeal, error: updateError } = await supabase
        .from("deals")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ ok: false, code: "DB_ERROR", message: updateError.message }, { status: 500 });
      }

      await supabase.from("deal_activity_log").insert({
        deal_id: id,
        user_id: user.id,
        entry_type: "system",
        content: `Gig published by ${displayName}`,
      });

      // Fire the "your gig is live" email here — this is the actual moment
      // the deal transitions from draft to pending_acceptance. The POST
      // handler in src/app/api/deals/route.ts intentionally does NOT fire
      // this email on draft inserts (because the wizard auto-saves drafts
      // every 30 seconds), so the publish handler is responsible for it.
      if (profile?.email) {
        const serviceClient = createServiceClient();
        const hasRecipient =
          updatedDeal.deal_type === "private" &&
          typeof updatedDeal.recipient_name === "string" &&
          updatedDeal.recipient_name.trim().length > 0;

        await sendAndLogNotification({
          supabase: serviceClient,
          type: hasRecipient
            ? "deal_published_with_recipient"
            : "deal_published_no_recipient",
          userId: user.id,
          dealId: id,
          email: profile.email,
          data: {
            dealTitle: updatedDeal.title,
            dealSlug: updatedDeal.deal_link_slug,
            amount: updatedDeal.total_amount,
            recipientName: hasRecipient ? updatedDeal.recipient_name : undefined,
            recipientEmail: hasRecipient
              ? updatedDeal.recipient_email || undefined
              : undefined,
          },
        });
      }

      // NOTE: Invite email to the recipient is NOT fired here. The recipient
      // fields are persisted in the update above, and the client manually
      // fires the invite via POST /api/deals/[id]/send-invite once they're
      // ready. This guarantees the invite email is honest about whether
      // escrow is funded at the moment of sending.

      return NextResponse.json({ ok: true, deal: updatedDeal, slug: updatedDeal.deal_link_slug });
    }

    // Save updates to an existing draft
    if (body.is_draft === true) {
      if (deal.status !== "draft") {
        return NextResponse.json(
          { ok: false, code: "INVALID_STATUS", message: "Only draft deals can be updated as drafts" },
          { status: 400 }
        );
      }
      if (deal.client_user_id !== user.id) {
        return NextResponse.json(
          { ok: false, code: "FORBIDDEN", message: "Only the client can update this draft" },
          { status: 403 }
        );
      }

      const { data: updatedDeal, error: updateError } = await supabase
        .from("deals")
        .update({
          title: body.title || deal.title,
          description: body.description ?? deal.description,
          deliverables: body.deliverables ?? deal.deliverables,
          description_brief_url: body.description_brief_url ?? deal.description_brief_url,
          deliverables_brief_url: body.deliverables_brief_url ?? deal.deliverables_brief_url,
          total_amount: body.total_amount || deal.total_amount,
          category: body.category ?? deal.category,
          other_category_description: body.other_category_description ?? deal.other_category_description,
          payment_frequency: body.payment_frequency || deal.payment_frequency,
          deadline: body.deadline ?? deal.deadline,
          deal_type: body.deal_type || deal.deal_type,
          has_milestones: body.has_milestones ?? deal.has_milestones,
          screening_questions: body.screening_questions ?? deal.screening_questions,
          max_applicants: body.max_applicants ?? deal.max_applicants,
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

      return NextResponse.json({ ok: true, deal: updatedDeal, slug: updatedDeal.deal_link_slug });
    }

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
        .update({
          freelancer_user_id: user.id,
          accepted_at: new Date().toISOString(),
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
