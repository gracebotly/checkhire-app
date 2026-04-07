import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAndLogNotification } from "@/lib/email/logNotification";
import { escalateCancellationRequestToDispute } from "@/lib/cancellation-requests/escalate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verify cron secret (matches the pattern in auto-release/route.ts)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  let escalated = 0;
  const errors: string[] = [];

  const { data: expired } = await supabase
    .from("cancellation_requests")
    .select("id, deal_id, requested_by")
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString());

  for (const req of expired || []) {
    const result = await escalateCancellationRequestToDispute({
      serviceClient: supabase,
      cancellationRequestId: req.id,
      dealId: req.deal_id,
      triggeredByUserId: null,
      isAutomatic: true,
    });

    if (!result.ok) {
      errors.push(`request ${req.id}: ${result.error}`);
      continue;
    }

    escalated++;

    // Fetch deal + both parties for notification
    const { data: deal } = await supabase
      .from("deals")
      .select(
        "title, deal_link_slug, client_user_id, freelancer_user_id, guest_freelancer_email"
      )
      .eq("id", req.deal_id)
      .maybeSingle();
    if (!deal) continue;

    // Activity log
    await supabase.from("deal_activity_log").insert({
      deal_id: req.deal_id,
      user_id: null,
      entry_type: "system",
      content:
        "Cancellation request auto-escalated to formal dispute (no response within 72 hours)",
    });

    // Notify both parties
    const sharedData = {
      dealTitle: deal.title,
      dealSlug: deal.deal_link_slug,
    };

    const partyIds = [deal.client_user_id, deal.freelancer_user_id].filter(
      Boolean
    ) as string[];
    for (const partyId of partyIds) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", partyId)
        .maybeSingle();
      if (profile?.email) {
        await sendAndLogNotification({
          supabase,
          type: "cancellation_auto_escalated",
          userId: partyId,
          dealId: req.deal_id,
          email: profile.email,
          data: sharedData,
        });
      }
    }
    if (deal.guest_freelancer_email && !deal.freelancer_user_id) {
      await sendAndLogNotification({
        supabase,
        type: "cancellation_auto_escalated",
        userId: "guest",
        dealId: req.deal_id,
        email: deal.guest_freelancer_email,
        data: sharedData,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    escalated,
    errors,
  });
}
