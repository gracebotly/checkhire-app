import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { runAllAnomalyChecks } from "@/lib/api/anomalyDetection";
import { recalculateScore } from "@/lib/employer/recalculateScore";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/detect-anomalies
 *
 * Vercel cron job — runs every 6 hours.
 * Scans access_audit_log and messages for suspicious behavioral patterns.
 * Creates system-generated flags for detected anomalies.
 * Logs rate_limit_events for investigation queue.
 */
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anomalies = await runAllAnomalyChecks();

  if (anomalies.length === 0) {
    console.log("[cron/detect-anomalies] No anomalies detected.");
    return NextResponse.json({ ok: true, anomalies_detected: 0, flags_created: 0 });
  }

  let flagsCreated = 0;
  let rateLimitEventsCreated = 0;

  for (const anomaly of anomalies) {
    // Check if there's already an open system flag for this employer + anomaly type
    const { data: existing } = await supabaseAdmin
      .from("flags")
      .select("id")
      .eq("reporter_type", "system")
      .eq("target_type", "employer")
      .eq("target_id", anomaly.employer_id)
      .eq("reason", "data_harvesting")
      .in("status", ["pending", "investigating"])
      .maybeSingle();

    if (existing) {
      // Already flagged — skip to avoid duplicate flags
      continue;
    }

    // Create flag
    const { error: flagError } = await supabaseAdmin
      .from("flags")
      .insert({
        reporter_id: null,
        reporter_type: "system",
        target_type: "employer",
        target_id: anomaly.employer_id,
        reason: "data_harvesting",
        description: `[Auto-detected] ${anomaly.anomaly_type}: ${anomaly.details}`,
        severity_weight: anomaly.severity,
      });

    if (!flagError) {
      flagsCreated++;
      console.log(
        `[cron/detect-anomalies] Flagged employer ${anomaly.employer_id}: ${anomaly.anomaly_type}`
      );
    } else {
      console.error(
        `[cron/detect-anomalies] Failed to create flag for ${anomaly.employer_id}:`,
        flagError.message
      );
    }

    // Log rate_limit_event for the investigation queue
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { error: rleError } = await supabaseAdmin
      .from("rate_limit_events")
      .insert({
        employer_id: anomaly.employer_id,
        endpoint: `anomaly:${anomaly.anomaly_type}`,
        hits_in_window: 1,
        window_start: windowStart.toISOString(),
        window_end: now.toISOString(),
        flagged: true,
        reviewed: false,
      });

    if (!rleError) {
      rateLimitEventsCreated++;
    }

    // Recalculate the employer's transparency score (flag penalty kicks in)
    recalculateScore(anomaly.employer_id).catch(() => {});
  }

  console.log(
    `[cron/detect-anomalies] Complete: anomalies=${anomalies.length}, flags=${flagsCreated}, rate_limit_events=${rateLimitEventsCreated}`
  );

  return NextResponse.json({
    ok: true,
    anomalies_detected: anomalies.length,
    flags_created: flagsCreated,
    rate_limit_events_created: rateLimitEventsCreated,
  });
}
