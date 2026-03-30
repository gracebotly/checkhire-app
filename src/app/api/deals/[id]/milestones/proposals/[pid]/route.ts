import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { proposalActionSchema } from "@/lib/validation/escrow";

export const PATCH = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string; pid: string }> }) => {
    const { id, pid } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = proposalActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

    const { action } = parsed.data;

    // Fetch proposal
    const { data: proposal } = await supabase.from("milestone_change_proposals").select("*").eq("id", pid).eq("deal_id", id).maybeSingle();
    if (!proposal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Proposal not found" }, { status: 404 });
    if (proposal.status !== "pending") return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Proposal already resolved" }, { status: 400 });
    if (proposal.proposed_by === user.id) return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "You cannot approve/reject your own proposal" }, { status: 403 });

    // Verify the user is the other participant
    const { data: deal } = await supabase.from("deals").select("client_user_id, freelancer_user_id").eq("id", id).maybeSingle();
    if (!deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });
    if (deal.client_user_id !== user.id && deal.freelancer_user_id !== user.id) {
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not a participant" }, { status: 403 });
    }

    const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = profile?.display_name || "Unknown";

    if (action === "approve") {
      if (proposal.proposal_type === "add") {
        // Determine position for new milestone
        const { data: existingMs } = await supabase.from("milestones").select("position").eq("deal_id", id).order("position", { ascending: false }).limit(1);
        const nextPosition = (existingMs?.[0]?.position ?? -1) + 1;

        await supabase.from("milestones").insert({
          deal_id: id,
          title: proposal.proposed_title!,
          description: proposal.proposed_description || null,
          amount: proposal.proposed_amount!,
          position: nextPosition,
        });
      } else if (proposal.proposal_type === "modify" && proposal.milestone_id) {
        const updates: Record<string, unknown> = {};
        if (proposal.proposed_title) updates.title = proposal.proposed_title;
        if (proposal.proposed_amount) updates.amount = proposal.proposed_amount;
        if (proposal.proposed_description) updates.description = proposal.proposed_description;
        await supabase.from("milestones").update(updates).eq("id", proposal.milestone_id);
      } else if (proposal.proposal_type === "remove" && proposal.milestone_id) {
        // Only allow removing unfunded milestones
        const { data: ms } = await supabase.from("milestones").select("status").eq("id", proposal.milestone_id).maybeSingle();
        if (ms?.status !== "pending_funding") {
          return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Can only remove unfunded milestones" }, { status: 400 });
        }
        await supabase.from("milestones").delete().eq("id", proposal.milestone_id);
      }

      await supabase.from("milestone_change_proposals").update({ status: "approved", responded_at: new Date().toISOString() }).eq("id", pid);
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} approved the milestone change` });
    } else {
      await supabase.from("milestone_change_proposals").update({ status: "rejected", responded_at: new Date().toISOString() }).eq("id", pid);
      await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} rejected the milestone change` });
    }

    return NextResponse.json({ ok: true });
  }
);
