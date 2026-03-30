import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { submitWorkSchema } from "@/lib/validation/escrow";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = submitWorkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

    const { milestone_id } = parsed.data;

    const { data: deal } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    if (!deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });
    if (deal.freelancer_user_id !== user.id) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the freelancer can submit work" }, { status: 403 });

    const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = profile?.display_name || "Freelancer";

    const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    if (milestone_id) {
      const { data: milestone } = await supabase.from("milestones").select("*").eq("id", milestone_id).eq("deal_id", id).maybeSingle();
      if (!milestone) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
      if (!["in_progress", "funded", "revision_requested"].includes(milestone.status)) {
        return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Milestone cannot be submitted in its current state" }, { status: 400 });
      }

      await supabase.from("milestones").update({ status: "submitted", submitted_at: new Date().toISOString(), auto_release_at: autoReleaseAt }).eq("id", milestone_id);
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} submitted milestone "${milestone.title}" for review — 72-hour countdown started` });
    } else {
      if (!["in_progress", "funded", "revision_requested"].includes(deal.status)) {
        return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Gig cannot be submitted in its current state" }, { status: 400 });
      }

      await supabase.from("deals").update({ status: "submitted", submitted_at: new Date().toISOString(), auto_release_at: autoReleaseAt }).eq("id", id);
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} submitted work for review — 72-hour countdown started` });
    }

    // Email the client
    const { data: clientProfile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    if (clientProfile?.email) {
      const serviceClient = createServiceClient();
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "work_submitted",
        userId: deal.client_user_id,
        dealId: id,
        email: clientProfile.email,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          amount: deal.total_amount,
        },
      });
    }

    return NextResponse.json({ ok: true, auto_release_at: autoReleaseAt });
  }
);
