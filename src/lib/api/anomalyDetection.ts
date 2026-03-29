import { createClient as createServiceClient } from "@supabase/supabase-js";
import { detectPiiRequests } from "@/lib/chat/piiDetection";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AnomalyResult = {
  employer_id: string;
  anomaly_type: string;
  details: string;
  severity: number;
};

/**
 * Detect employers with 50+ candidate_view actions in the last 24 hours.
 * This is a strong signal of data harvesting — legitimate employers don't
 * need to view 50 candidate profiles in a single day.
 */
export async function detectVolumeAnomalies(): Promise<AnomalyResult[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin.rpc("detect_volume_anomalies", {
    p_since: since,
    p_threshold: 50,
  });

  // If the RPC doesn't exist, fall back to a raw query approach
  if (error || !data) {
    // Fallback: query access_audit_log directly
    const { data: logs } = await supabaseAdmin
      .from("access_audit_log")
      .select("employer_id")
      .eq("action_type", "candidate_view")
      .gte("created_at", since);

    if (!logs || logs.length === 0) return [];

    // Count per employer
    const counts: Record<string, number> = {};
    for (const log of logs) {
      if (log.employer_id) {
        counts[log.employer_id] = (counts[log.employer_id] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .filter(([, count]) => count >= 50)
      .map(([employer_id, count]) => ({
        employer_id,
        anomaly_type: "volume_spike",
        details: `${count} candidate profile views in the last 24 hours (threshold: 50)`,
        severity: 3,
      }));
  }

  return (data as { employer_id: string; view_count: number }[]).map((d) => ({
    employer_id: d.employer_id,
    anomaly_type: "volume_spike",
    details: `${d.view_count} candidate profile views in the last 24 hours (threshold: 50)`,
    severity: 3,
  }));
}

/**
 * Detect employers who sent 20+ interview requests in the last 7 days
 * on a single listing. This pattern suggests trying to unlock names at scale.
 */
export async function detectMassInterviewAnomalies(): Promise<AnomalyResult[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabaseAdmin
    .from("access_audit_log")
    .select("employer_id, application_id")
    .eq("action_type", "interview_request")
    .gte("created_at", since);

  if (!logs || logs.length === 0) return [];

  // Group by employer_id, then count unique application_ids
  const employerCounts: Record<string, Set<string>> = {};
  for (const log of logs) {
    if (log.employer_id && log.application_id) {
      if (!employerCounts[log.employer_id]) {
        employerCounts[log.employer_id] = new Set();
      }
      employerCounts[log.employer_id].add(log.application_id);
    }
  }

  return Object.entries(employerCounts)
    .filter(([, apps]) => apps.size >= 20)
    .map(([employer_id, apps]) => ({
      employer_id,
      anomaly_type: "mass_interview_requests",
      details: `${apps.size} interview requests in the last 7 days (threshold: 20)`,
      severity: 3,
    }));
}

/**
 * Detect employers where >80% of their applications have reached
 * disclosure_level >= 2 (name revealed) but they have zero hires.
 * This suggests unlocking names without intent to hire.
 */
export async function detectStageAbuseAnomalies(): Promise<AnomalyResult[]> {
  // Get all employers who have applications
  const { data: employers } = await supabaseAdmin
    .from("employer_users")
    .select("employer_id")
    .limit(500);

  if (!employers || employers.length === 0) return [];

  const uniqueEmployerIds = [...new Set(employers.map((e) => e.employer_id))];
  const results: AnomalyResult[] = [];

  for (const employerId of uniqueEmployerIds) {
    // Get listing IDs for this employer
    const { data: listings } = await supabaseAdmin
      .from("job_listings")
      .select("id")
      .eq("employer_id", employerId);

    if (!listings || listings.length === 0) continue;

    const listingIds = listings.map((l) => l.id);

    // Count total apps and stage 2+ apps
    const { count: totalApps } = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .in("job_listing_id", listingIds);

    if (!totalApps || totalApps < 5) continue; // need minimum sample

    const { count: stage2Plus } = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .in("job_listing_id", listingIds)
      .gte("disclosure_level", 2);

    const { count: hiredCount } = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .in("job_listing_id", listingIds)
      .eq("status", "hired");

    const advanceRate = (stage2Plus ?? 0) / totalApps;

    if (advanceRate > 0.8 && (hiredCount ?? 0) === 0) {
      results.push({
        employer_id: employerId,
        anomaly_type: "stage_advancement_abuse",
        details: `${Math.round(advanceRate * 100)}% of applications advanced to Stage 2+ with 0 hires (${totalApps} total applications)`,
        severity: 2,
      });
    }
  }

  return results;
}

/**
 * Detect employers who sent 5+ messages flagged for PII requests in the last 24 hours.
 * Uses the existing piiDetection module to scan recent messages.
 */
export async function detectPiiChatAnomalies(): Promise<AnomalyResult[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get recent employer messages
  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("sender_id, message_text")
    .eq("sender_type", "employer")
    .gte("created_at", since)
    .limit(1000);

  if (!messages || messages.length === 0) return [];

  // Scan each message and count PII flags per sender
  const flagCounts: Record<string, number> = {};
  for (const msg of messages) {
    const result = detectPiiRequests(msg.message_text);
    if (result.flagged) {
      flagCounts[msg.sender_id] = (flagCounts[msg.sender_id] || 0) + 1;
    }
  }

  // Resolve sender_id → employer_id
  const results: AnomalyResult[] = [];
  for (const [senderId, count] of Object.entries(flagCounts)) {
    if (count < 5) continue;

    const { data: eu } = await supabaseAdmin
      .from("employer_users")
      .select("employer_id")
      .eq("user_id", senderId)
      .maybeSingle();

    if (eu?.employer_id) {
      results.push({
        employer_id: eu.employer_id,
        anomaly_type: "pii_chat_pattern",
        details: `${count} messages with PII request patterns in the last 24 hours (threshold: 5)`,
        severity: 2,
      });
    }
  }

  return results;
}

/**
 * Run all anomaly detection checks and return combined results.
 * Deduplicates by employer_id (keeps highest severity if multiple anomalies).
 */
export async function runAllAnomalyChecks(): Promise<AnomalyResult[]> {
  const [volume, massInterview, stageAbuse, piiChat] = await Promise.allSettled([
    detectVolumeAnomalies(),
    detectMassInterviewAnomalies(),
    detectStageAbuseAnomalies(),
    detectPiiChatAnomalies(),
  ]);

  const all: AnomalyResult[] = [];

  for (const result of [volume, massInterview, stageAbuse, piiChat]) {
    if (result.status === "fulfilled") {
      all.push(...result.value);
    } else {
      console.error("[anomalyDetection] Check failed:", result.reason);
    }
  }

  return all;
}
