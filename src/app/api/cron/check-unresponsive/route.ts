import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createSystemMessage } from "@/lib/chat/systemMessage";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/check-unresponsive
 *
 * Vercel cron job — runs daily at 6:00 AM UTC.
 * Detects active listings with 20+ days of zero employer activity
 * (no candidate_view, message_sent, or stage_advance actions).
 *
 * First offense: sends warning via system message.
 * Listing already warned 20+ days ago with still no activity: pauses the listing.
 */
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

  // Find active listings created 20+ days ago with at least 1 application
  const { data: staleListings, error } = await supabaseAdmin
    .from("job_listings")
    .select("id, employer_id, title, slug, created_at, current_application_count")
    .eq("status", "active")
    .gt("current_application_count", 0)
    .lte("created_at", twentyDaysAgo.toISOString());

  if (error) {
    console.error("[cron/check-unresponsive] Query error:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!staleListings || staleListings.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, warned: 0, paused: 0 });
  }

  let warned = 0;
  let paused = 0;

  for (const listing of staleListings) {
    // Check if the employer has taken ANY action on this listing's applications
    const { data: actions } = await supabaseAdmin
      .from("access_audit_log")
      .select("id")
      .eq("employer_id", listing.employer_id)
      .in("action_type", ["candidate_view", "message_sent", "stage_advance"])
      .gte("created_at", twentyDaysAgo.toISOString())
      .limit(1);

    // If there IS recent activity, skip this listing
    if (actions && actions.length > 0) continue;

    // Check if we already warned about this listing (look for a system message)
    const { data: applications } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("job_listing_id", listing.id)
      .limit(1);

    if (!applications || applications.length === 0) continue;

    const firstAppId = applications[0].id;

    const { data: existingWarning } = await supabaseAdmin
      .from("messages")
      .select("id, created_at")
      .eq("application_id", firstAppId)
      .eq("sender_type", "system")
      .eq("message_type", "system")
      .ilike("message_text", "%listing has had no activity%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingWarning) {
      // First offense: send warning to employer via system message on first application
      await createSystemMessage(
        firstAppId,
        `Your listing "${listing.title}" has had no activity for 20+ days. Please review your applications or close the listing to maintain your transparency score.`,
        "system",
        { action: "unresponsive_warning", listing_id: listing.id }
      ).catch(() => {});

      warned++;
      console.log(`[cron/check-unresponsive] Warned listing ${listing.id}: "${listing.title}"`);
    } else {
      // Check if warning was 20+ days ago (40 days total with no activity)
      const warningDate = new Date(existingWarning.created_at);
      const daysSinceWarning = (now.getTime() - warningDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceWarning >= 20) {
        // Second offense: pause the listing
        const { error: pauseError } = await supabaseAdmin
          .from("job_listings")
          .update({ status: "paused" })
          .eq("id", listing.id);

        if (!pauseError) {
          paused++;
          console.log(`[cron/check-unresponsive] Paused listing ${listing.id}: "${listing.title}"`);

          // Notify via system message
          await createSystemMessage(
            firstAppId,
            `Your listing "${listing.title}" has been paused due to prolonged inactivity. Review your applications or close the listing to reactivate.`,
            "system",
            { action: "unresponsive_paused", listing_id: listing.id }
          ).catch(() => {});
        }
      }
    }
  }

  console.log(
    `[cron/check-unresponsive] Complete: checked=${staleListings.length}, warned=${warned}, paused=${paused}`
  );

  return NextResponse.json({
    ok: true,
    checked: staleListings.length,
    warned,
    paused,
  });
}
