import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { milestoneProposalSchema } from "@/lib/validation/escrow";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const parsed = milestoneProposalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });

    const { proposal_type, milestone_id, title, amount, description } = parsed.data;

    const { data: deal } = await supabase.from("deals").select("client_user_id, freelancer_user_id").eq("id", id).maybeSingle();
    if (!deal) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Deal not found" }, { status: 404 });
    if (deal.client_user_id !== user.id && deal.freelancer_user_id !== user.id) {
      return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not a participant" }, { status: 403 });
    }

    const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = profile?.display_name || "Unknown";

    const { data: proposal, error } = await supabase.from("milestone_change_proposals").insert({
      deal_id: id,
      milestone_id: milestone_id || null,
      proposed_by: user.id,
      proposal_type,
      proposed_title: title || null,
      proposed_amount: amount || null,
      proposed_description: description || null,
    }).select().single();

    if (error) return NextResponse.json({ ok: false, code: "DB_ERROR", message: error.message }, { status: 500 });

    const actionLabel = proposal_type === "add" ? "adding" : proposal_type === "modify" ? "modifying" : "removing";
    await supabase.from("deal_activity_log").insert({ deal_id: id, user_id: null, entry_type: "system", content: `${displayName} proposed ${actionLabel} a milestone${title ? `: "${title}"` : ""}` });

    return NextResponse.json({ ok: true, proposal });
  }
);
