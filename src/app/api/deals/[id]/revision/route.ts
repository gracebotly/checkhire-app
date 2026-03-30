import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { revisionSchema } from "@/lib/validation/escrow";
import { sendRevisionRequestedEmail } from "@/lib/email/escrow-notifications";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = revisionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

    const { notes, milestone_id } = parsed.data;

    const { data: deal } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    if (!deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });
    if (deal.client_user_id !== user.id) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Only the client can request revisions" }, { status: 403 });

    const { data: clientProfile } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = clientProfile?.display_name || "Client";

    if (milestone_id) {
      const { data: milestone } = await supabase.from("milestones").select("*").eq("id", milestone_id).eq("deal_id", id).maybeSingle();
      if (!milestone) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
      if (milestone.status !== "submitted") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Milestone has not been submitted" }, { status: 400 });
      if (milestone.revision_count >= 3) return NextResponse.json({ ok: false, code: "MAX_REVISIONS", message: "Maximum revisions reached (3/3). Please confirm delivery or open a dispute." }, { status: 400 });

      const newCount = milestone.revision_count + 1;
      await supabase.from("milestones").update({ status: "revision_requested", auto_release_at: null, revision_count: newCount }).eq("id", milestone_id);
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} requested revision on "${milestone.title}" (${newCount}/3): ${notes}` });
    } else {
      if (deal.status !== "submitted") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Work has not been submitted" }, { status: 400 });
      if (deal.revision_count >= 3) return NextResponse.json({ ok: false, code: "MAX_REVISIONS", message: "Maximum revisions reached (3/3). Please confirm delivery or open a dispute." }, { status: 400 });

      const newCount = deal.revision_count + 1;
      await supabase.from("deals").update({ status: "revision_requested", auto_release_at: null, revision_count: newCount }).eq("id", id);
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} requested revision (${newCount}/3): ${notes}` });
    }

    // Email freelancer
    const { data: freelancerProfile } = await supabase.from("user_profiles").select("email").eq("id", deal.freelancer_user_id!).maybeSingle();
    if (freelancerProfile?.email) {
      const count = milestone_id
        ? ((await supabase.from("milestones").select("revision_count").eq("id", milestone_id).maybeSingle()).data?.revision_count || 1)
        : (deal.revision_count + 1);
      await sendRevisionRequestedEmail({ to: freelancerProfile.email, dealTitle: deal.title, dealSlug: deal.deal_link_slug, notes, revisionNumber: count });
      await supabase.from("email_notifications").insert({ user_id: deal.freelancer_user_id!, deal_id: id, notification_type: "revision_requested", email_address: freelancerProfile.email, sent_at: new Date().toISOString() });
    }

    return NextResponse.json({ ok: true });
  }
);
