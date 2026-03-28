import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Scores a listing's title + description against the MLM indicator keywords table.
 * Returns a numeric score — higher = more MLM indicators detected.
 * Listings above a threshold (e.g., 5) should get status='review_pending'.
 */
export async function scoreMlmIndicators(
  title: string,
  description: string
): Promise<number> {
  const { data: keywords } = await supabaseAdmin
    .from("mlm_indicator_keywords")
    .select("keyword_phrase, weight")
    .eq("active", true);

  if (!keywords || keywords.length === 0) return 0;

  const combined = `${title} ${description}`.toLowerCase();
  let score = 0;

  for (const kw of keywords) {
    if (combined.includes(kw.keyword_phrase.toLowerCase())) {
      score += kw.weight;
    }
  }

  return score;
}

/** Threshold above which a listing is held for review */
export const MLM_REVIEW_THRESHOLD = 5;
