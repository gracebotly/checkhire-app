import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { interestActionSchema } from "@/lib/validation/interest";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const PATCH = withApiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string; iid: string }> }
  ) => {
    const { id, iid } = await params;
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
    const parsed = interestActionSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );

    const { action } = parsed.data;

    // Fetch deal
    const { data: deal } = await supabase
      .from("deals")
      .select("id, title, deal_link_slug, deal_type, status, client_user_id, freelancer_user_id, total_amount")
      .eq("id", id)
      .maybeSingle();

    if (!deal)
      return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });

    if (deal.client_user_id !== user.id)
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can manage interest" }, { status: 403 });

    // Fetch interest entry
    const { data: interest } = await supabase
      .from("deal_interest")
      .select("*, user:user_profiles!deal_interest_user_id_fkey(display_name, email)")
      .eq("id", iid)
      .eq("deal_id", id)
      .maybeSingle();

    if (!interest)
      return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Interest entry not found" }, { status: 404 });

    if (interest.status !== "pending")
      return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "This interest entry has already been resolved" }, { status: 400 });

    const serviceClient = createServiceClient();
    const interestUser = interest.user as unknown as { display_name: string | null; email: string | null };

    if (action === "accept") {
      if (deal.freelancer_user_id)
        return NextResponse.json({ ok: false, code: "ALREADY_FILLED", message: "This gig already has a freelancer" }, { status: 400 });

      // Accept this interest
      await supabase
        .from("deal_interest")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", iid);

      // Set freelancer on the deal
      await supabase
        .from("deals")
        .update({ freelancer_user_id: interest.user_id })
        .eq("id", id);

      // Reject all other pending interests
      await serviceClient
        .from("deal_interest")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("deal_id", id)
        .neq("id", iid)
        .eq("status", "pending");

      // Activity log
      await serviceClient.from("deal_activity_log").insert({
        deal_id: id,
        user_id: null,
        entry_type: "system",
        content: `Client selected ${interestUser.display_name || "a freelancer"} for this gig`,
      });

      // Notify selected freelancer
      if (interestUser.email) {
        await sendAndLogNotification({
          supabase: serviceClient,
          type: "interest_accepted",
          userId: interest.user_id,
          dealId: id,
          email: interestUser.email,
          data: {
            dealTitle: deal.title,
            dealSlug: deal.deal_link_slug,
            amount: deal.total_amount,
          },
        });
      }

      // Notify ALL rejected freelancers (batch)
      const { data: rejectedInterests } = await serviceClient
        .from("deal_interest")
        .select("user_id, user:user_profiles!deal_interest_user_id_fkey(email)")
        .eq("deal_id", id)
        .eq("status", "rejected");

      for (const ri of rejectedInterests || []) {
        const riUser = ri.user as unknown as { email: string | null };
        if (riUser?.email) {
          await sendAndLogNotification({
            supabase: serviceClient,
            type: "deal_filled",
            userId: ri.user_id,
            dealId: id,
            email: riUser.email,
            data: {
              dealTitle: deal.title,
              dealSlug: deal.deal_link_slug,
            },
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      await supabase
        .from("deal_interest")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", iid);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, code: "INVALID_ACTION", message: "Unknown action" },
      { status: 400 }
    );
  }
);
