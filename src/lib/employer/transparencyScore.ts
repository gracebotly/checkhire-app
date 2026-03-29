import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { TransparencyScoreBreakdown } from "@/types/database";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calculates the transparency score for an employer.
 *
 * Components (weighted):
 * - Hire rate (30%): percentage of closed/filled/expired listings that resulted in a hire
 * - Responsiveness (20%): average time to first employer action on applications
 * - Close-out compliance (15%): percentage of expired listings with a close_reason set
 * - Post-hire check-in results (15%): average of positive responses from employer_reviews
 * - Application review rate (10%): percentage of applications the employer acted on
 * - Flag penalty (10% deduction): unresolved flags reduce the score
 *
 * Each component is scored 0.0–5.0, then weighted and summed.
 * Total score is clamped to 0.0–5.0.
 */
export async function calculateTransparencyScore(
  employerId: string
): Promise<TransparencyScoreBreakdown> {
  const [
    hireRate,
    responsiveness,
    closeoutCompliance,
    checkinResults,
    reviewRate,
    flagPenalty,
  ] = await Promise.all([
    calcHireRate(employerId),
    calcResponsiveness(employerId),
    calcCloseoutCompliance(employerId),
    calcCheckinResults(employerId),
    calcReviewRate(employerId),
    calcFlagPenalty(employerId),
  ]);

  // Weighted sum
  const raw =
    hireRate * 0.3 +
    responsiveness * 0.2 +
    closeoutCompliance * 0.15 +
    checkinResults * 0.15 +
    reviewRate * 0.1 -
    flagPenalty; // flag penalty is already scaled as a deduction

  const total = Math.max(0, Math.min(5, Math.round(raw * 10) / 10));

  return {
    total,
    hire_rate: hireRate,
    responsiveness,
    closeout_compliance: closeoutCompliance,
    checkin_results: checkinResults,
    review_rate: reviewRate,
    flag_penalty: flagPenalty,
    last_calculated_at: new Date().toISOString(),
  };
}

/**
 * Hire rate: What percentage of terminated listings (closed/filled/expired) resulted in a hire?
 * 0 terminated listings = neutral 2.5
 */
async function calcHireRate(employerId: string): Promise<number> {
  const { count: terminated } = await supabaseAdmin
    .from("job_listings")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .in("status", ["filled", "closed", "expired"]);

  if (!terminated || terminated === 0) return 2.5; // neutral — no data yet

  const { count: filled } = await supabaseAdmin
    .from("job_listings")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .eq("status", "filled");

  const rate = (filled ?? 0) / terminated;
  // 50%+ hire rate = 5.0, 25% = 3.5, 10% = 2.0, 0% = 0.5
  return Math.max(0.5, Math.min(5, rate * 8 + 0.5));
}

/**
 * Responsiveness: Average time from application creation to first employer action.
 * Uses access_audit_log to find the earliest candidate_view or message_sent per application.
 * No data = neutral 2.5
 */
async function calcResponsiveness(employerId: string): Promise<number> {
  // Get average hours to first action across all applications on this employer's listings
  const { data } = await supabaseAdmin.rpc("calc_employer_responsiveness", {
    p_employer_id: employerId,
  });

  // If RPC doesn't exist yet or returns null, return neutral
  if (!data || data === null) {
    // Fallback: simple query
    const { data: apps } = await supabaseAdmin
      .from("applications")
      .select("id, created_at, job_listing_id")
      .in(
        "job_listing_id",
        (
          await supabaseAdmin
            .from("job_listings")
            .select("id")
            .eq("employer_id", employerId)
        ).data?.map((l) => l.id) ?? []
      )
      .limit(100);

    if (!apps || apps.length === 0) return 2.5;

    let totalHours = 0;
    let counted = 0;

    for (const app of apps) {
      const { data: firstAction } = await supabaseAdmin
        .from("access_audit_log")
        .select("created_at")
        .eq("application_id", app.id)
        .eq("employer_id", employerId)
        .in("action_type", ["candidate_view", "message_sent"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstAction) {
        const hours =
          (new Date(firstAction.created_at).getTime() -
            new Date(app.created_at).getTime()) /
          (1000 * 60 * 60);
        totalHours += hours;
        counted++;
      }
    }

    if (counted === 0) return 2.5;

    const avgHours = totalHours / counted;
    // < 24h = 5.0, < 48h = 4.0, < 72h = 3.0, < 168h (7d) = 2.0, > 7d = 1.0
    if (avgHours < 24) return 5.0;
    if (avgHours < 48) return 4.0;
    if (avgHours < 72) return 3.0;
    if (avgHours < 168) return 2.0;
    return 1.0;
  }

  return 2.5;
}

/**
 * Close-out compliance: What percentage of expired listings have a close_reason set?
 * Employers who let listings expire without closing them properly get penalized.
 * No expired listings = 5.0 (perfect)
 */
async function calcCloseoutCompliance(employerId: string): Promise<number> {
  const { count: expired } = await supabaseAdmin
    .from("job_listings")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .in("status", ["expired", "closed", "filled"]);

  if (!expired || expired === 0) return 5.0; // no closures needed yet

  const { count: withReason } = await supabaseAdmin
    .from("job_listings")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", employerId)
    .in("status", ["closed", "filled"])
    .not("close_reason", "is", null);

  const rate = (withReason ?? 0) / expired;
  return Math.round(rate * 5 * 10) / 10;
}

/**
 * Post-hire check-in results: Average positivity from employer_reviews.
 * Each boolean (heard_back, job_was_real, got_paid) that's true = 1 point.
 * Max 3 points per review → scaled to 0–5.
 * No reviews = neutral 2.5
 */
async function calcCheckinResults(employerId: string): Promise<number> {
  const { data: reviews } = await supabaseAdmin
    .from("employer_reviews")
    .select("heard_back, job_was_real, got_paid")
    .eq("employer_id", employerId)
    .in("review_type", ["post_hire_30day", "post_hire_60day"]);

  if (!reviews || reviews.length === 0) return 2.5;

  let totalPoints = 0;
  let maxPoints = 0;

  for (const r of reviews) {
    if (r.heard_back === true) totalPoints++;
    if (r.job_was_real === true) totalPoints++;
    if (r.got_paid === true) totalPoints++;
    maxPoints += 2; // heard_back + job_was_real always apply
    if (r.got_paid !== null) maxPoints++; // got_paid only for gig jobs
  }

  if (maxPoints === 0) return 2.5;
  return Math.round((totalPoints / maxPoints) * 5 * 10) / 10;
}

/**
 * Application review rate: What percentage of applications did the employer act on?
 * "Acted on" = status moved beyond 'applied' (reviewed, shortlisted, etc.)
 * No applications = neutral 2.5
 */
async function calcReviewRate(employerId: string): Promise<number> {
  // Get all application IDs for this employer's listings
  const { data: listings } = await supabaseAdmin
    .from("job_listings")
    .select("id")
    .eq("employer_id", employerId);

  if (!listings || listings.length === 0) return 2.5;

  const listingIds = listings.map((l) => l.id);

  const { count: totalApps } = await supabaseAdmin
    .from("applications")
    .select("id", { count: "exact", head: true })
    .in("job_listing_id", listingIds);

  if (!totalApps || totalApps === 0) return 2.5;

  const { count: acted } = await supabaseAdmin
    .from("applications")
    .select("id", { count: "exact", head: true })
    .in("job_listing_id", listingIds)
    .neq("status", "applied");

  const rate = (acted ?? 0) / totalApps;
  return Math.round(rate * 5 * 10) / 10;
}

/**
 * Flag penalty: Deduction based on unresolved flags.
 * Each unresolved flag with severity_weight deducts from the score.
 * Returns a positive number (the amount to subtract).
 */
async function calcFlagPenalty(employerId: string): Promise<number> {
  const { data: flags } = await supabaseAdmin
    .from("flags")
    .select("severity_weight")
    .eq("target_type", "employer")
    .eq("target_id", employerId)
    .in("status", ["pending", "investigating"]);

  if (!flags || flags.length === 0) return 0;

  const totalWeight = flags.reduce((sum, f) => sum + (f.severity_weight || 1), 0);
  // Each severity point = 0.3 deduction, capped at 2.5
  return Math.min(2.5, totalWeight * 0.3);
}
