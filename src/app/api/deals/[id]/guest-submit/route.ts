import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyGuestToken } from "@/lib/deals/guestToken";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();

    const guestToken = body.guest_token;
    if (!guestToken || typeof guestToken !== "string") {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Guest token required" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Fetch deal
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!deal || !deal.guest_freelancer_email) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Verify guest token
    if (!verifyGuestToken(guestToken, id, deal.guest_freelancer_email)) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Verify status allows submission
    if (!["in_progress", "funded", "revision_requested"].includes(deal.status)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_STATUS", message: "This gig cannot be submitted in its current state" },
        { status: 400 }
      );
    }

    // Check for at least 1 evidence entry
    const { data: evidenceEntries } = await supabase
      .from("deal_activity_log")
      .select("id")
      .eq("deal_id", id)
      .eq("is_submission_evidence", true)
      .limit(1);

    if (!evidenceEntries || evidenceEntries.length === 0) {
      return NextResponse.json(
        { ok: false, code: "NO_EVIDENCE", message: "Upload at least one piece of evidence before submitting." },
        { status: 400 }
      );
    }

    const autoReleaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // Update deal
    await supabase
      .from("deals")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        auto_release_at: autoReleaseAt,
      })
      .eq("id", id);

    // Activity log
    await supabase.from("deal_activity_log").insert({
      deal_id: id,
      user_id: null,
      entry_type: "system",
      content: "Work submitted for review — 72-hour countdown started",
    });

    // Email to client
    const { data: clientProfile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", deal.client_user_id)
      .maybeSingle();

    if (clientProfile?.email) {
      await sendAndLogNotification({
        supabase,
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

    return NextResponse.json({ ok: true });
  }
);
