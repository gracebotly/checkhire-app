import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { revisionSchema } from "@/lib/validation/escrow";
import { sendAndLogNotification } from "@/lib/email/logNotification";

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

    const serviceClient = createServiceClient();
    let revNumber: number;

    if (milestone_id) {
      const { data: milestone } = await supabase.from("milestones").select("*").eq("id", milestone_id).eq("deal_id", id).maybeSingle();
      if (!milestone) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Milestone not found" }, { status: 404 });
      if (milestone.status !== "submitted") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Milestone has not been submitted" }, { status: 400 });

      // No cap — unlimited revisions
      revNumber = (milestone.revision_count || 0) + 1;
      await serviceClient.from("milestones").update({ status: "revision_requested", auto_release_at: null, revision_count: revNumber }).eq("id", milestone_id);
      await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} requested revision on "${milestone.title}" (round ${revNumber}): ${notes}` });
    } else {
      if (deal.status !== "submitted") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Work has not been submitted" }, { status: 400 });

      // No cap — unlimited revisions
      revNumber = (deal.revision_count || 0) + 1;
      await serviceClient.from("deals").update({ status: "revision_requested", auto_release_at: null, revision_count: revNumber }).eq("id", id);
      await serviceClient.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} requested revision (round ${revNumber}): ${notes}` });
    }

    // Email freelancer — handle both authenticated and guest freelancers
    let freelancerEmail: string | null = null;
    let freelancerUserId: string | null = null;

    if (deal.freelancer_user_id) {
      // Authenticated freelancer — look up profile email
      const { data: freelancerProfile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", deal.freelancer_user_id)
        .maybeSingle();
      freelancerEmail = freelancerProfile?.email || null;
      freelancerUserId = deal.freelancer_user_id;
    } else if (deal.guest_freelancer_email) {
      // Guest freelancer — use email stored on the deal
      freelancerEmail = deal.guest_freelancer_email;
      freelancerUserId = null;
    }

    if (freelancerEmail) {
      await sendAndLogNotification({
        supabase: serviceClient,
        type: "revision_requested",
        userId: freelancerUserId,
        dealId: id,
        email: freelancerEmail,
        data: {
          dealTitle: deal.title,
          dealSlug: deal.deal_link_slug,
          notes,
          revisionNumber: revNumber,
          isGuestFreelancer: !deal.freelancer_user_id,
        },
      });
    }

    return NextResponse.json({ ok: true });
  }
);
