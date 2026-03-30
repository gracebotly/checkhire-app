import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAndLogNotification } from "@/lib/email/logNotification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  let remindersSent = 0;

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

    // Find deals completed ~24 hours ago
    const { data: deals } = await supabase
      .from("deals")
      .select(
        "id, title, deal_link_slug, client_user_id, freelancer_user_id"
      )
      .eq("status", "completed")
      .gte("completed_at", windowStart)
      .lte("completed_at", windowEnd);

    for (const deal of deals || []) {
      // Check existing ratings for this deal
      const { data: ratings } = await supabase
        .from("ratings")
        .select("rater_user_id")
        .eq("deal_id", deal.id);

      const raterIds = new Set((ratings || []).map((r) => r.rater_user_id));

      // Get both parties' profiles
      const { data: clientProfile } = await supabase
        .from("user_profiles")
        .select("email, display_name")
        .eq("id", deal.client_user_id)
        .maybeSingle();

      const { data: freelancerProfile } = await supabase
        .from("user_profiles")
        .select("email, display_name")
        .eq("id", deal.freelancer_user_id!)
        .maybeSingle();

      // Remind client if they haven't rated
      if (!raterIds.has(deal.client_user_id) && clientProfile?.email) {
        // Check we haven't already sent this reminder
        const { data: existing } = await supabase
          .from("email_notifications")
          .select("id")
          .eq("deal_id", deal.id)
          .eq("user_id", deal.client_user_id)
          .eq("notification_type", "rating_reminder")
          .maybeSingle();

        if (!existing) {
          await sendAndLogNotification({
            supabase,
            type: "rating_reminder",
            userId: deal.client_user_id,
            dealId: deal.id,
            email: clientProfile.email,
            data: {
              dealTitle: deal.title,
              dealSlug: deal.deal_link_slug,
              otherPartyName: freelancerProfile?.display_name || "the freelancer",
            },
          });
          remindersSent++;
        }
      }

      // Remind freelancer if they haven't rated
      if (
        deal.freelancer_user_id &&
        !raterIds.has(deal.freelancer_user_id) &&
        freelancerProfile?.email
      ) {
        const { data: existing } = await supabase
          .from("email_notifications")
          .select("id")
          .eq("deal_id", deal.id)
          .eq("user_id", deal.freelancer_user_id)
          .eq("notification_type", "rating_reminder")
          .maybeSingle();

        if (!existing) {
          await sendAndLogNotification({
            supabase,
            type: "rating_reminder",
            userId: deal.freelancer_user_id,
            dealId: deal.id,
            email: freelancerProfile.email,
            data: {
              dealTitle: deal.title,
              dealSlug: deal.deal_link_slug,
              otherPartyName: clientProfile?.display_name || "the client",
            },
          });
          remindersSent++;
        }
      }
    }
  } catch (err) {
    console.error("[rating-reminders] Cron error:", err);
    return NextResponse.json(
      { ok: false, error: "Cron execution error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, reminders_sent: remindersSent });
}
