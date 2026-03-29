import { createClient as createServiceClient } from "@supabase/supabase-js";
import { calculateTransparencyScore } from "./transparencyScore";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Recalculates an employer's transparency score and persists it to the database.
 * Non-fatal: logs errors but never throws. Safe to call fire-and-forget.
 *
 * Call this after: listing closed/filled, application status changed to hired,
 * review submitted, flag resolved.
 */
export async function recalculateScore(employerId: string): Promise<void> {
  try {
    const breakdown = await calculateTransparencyScore(employerId);

    const { error } = await supabaseAdmin
      .from("employers")
      .update({
        transparency_score: breakdown.total,
        last_score_calculated_at: breakdown.last_calculated_at,
      })
      .eq("id", employerId);

    if (error) {
      console.error(
        `[recalculateScore] Failed to update employer ${employerId}:`,
        error.message
      );
    } else {
      console.log(
        `[recalculateScore] Updated employer ${employerId}: score=${breakdown.total}`
      );
    }
  } catch (err) {
    console.error(`[recalculateScore] Error for employer ${employerId}:`, err);
  }
}
