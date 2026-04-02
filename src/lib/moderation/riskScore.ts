/**
 * Risk scoring engine for deal moderation.
 *
 * Returns a numeric risk score (0-100) and whether the deal should be auto-flagged.
 * Higher score = higher risk. Deals scoring >= 40 are flagged for admin review.
 *
 * Risk tiers:
 *   0-19  = Low risk   → auto-approved, no review needed
 *   20-39 = Medium risk → auto-approved but logged
 *   40-69 = High risk   → flagged for admin review, payouts blocked until approved
 *   70+   = Critical    → flagged for admin review, payouts blocked until approved
 */

// Known disposable email domains (top patterns)
const DISPOSABLE_DOMAINS = new Set([
  "guerrillamail.com", "guerrillamail.net", "tempmail.com", "throwaway.email",
  "mailinator.com", "yopmail.com", "sharklasers.com", "guerrillamailblock.com",
  "grr.la", "dispostable.com", "maildrop.cc", "temp-mail.org", "fakeinbox.com",
  "trashmail.com", "mailnesia.com", "tempail.com", "harakirimail.com",
  "mohmal.com", "burner.kiwi", "10minutemail.com",
]);

// Scam-adjacent keywords in gig descriptions (not blocked, but raise risk)
const RISKY_KEYWORDS = [
  /\b(wire transfer|western union|moneygram)\b/i,
  /\b(crypto only|bitcoin only|btc only|eth only)\b/i,
  /\b(guaranteed profit|guaranteed income|easy money)\b/i,
  /\b(no experience needed|no skills required)\b/i,
  /\b(work from home.*\$\d{3,}.*day)\b/i, // "$X00/day work from home"
  /\b(advance fee|upfront fee|registration fee)\b/i,
  /\b(personal assistant.*urgent)\b/i,
  /\b(reshipping|package forwarding|receive packages)\b/i,
  /\b(sugar daddy|sugar mama|sugar momma)\b/i,
  /\b(mlm|multi.level|network marketing|pyramid)\b/i,
  /\b(gift card|itunes card|google play card)\b/i,
];

export type RiskAssessment = {
  score: number;
  shouldFlag: boolean;
  reasons: string[];
};

export function calculateRiskScore(params: {
  completedDealsCount: number;
  trustBadge: string;
  dealAmount: number; // in cents
  title: string;
  description: string;
  deliverables: string | null;
  category: string | null;
  otherCategoryDescription: string | null;
  email: string | null;
  existingDealCount: number; // total deals by this user (including non-completed)
  recentDealCount: number; // deals created in last 1 hour
}): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];

  // ── User trust level ──
  if (params.completedDealsCount === 0 && params.existingDealCount === 0) {
    score += 30;
    reasons.push("First-time user (no previous gigs)");
  } else if (params.completedDealsCount === 0 && params.existingDealCount > 0) {
    score += 15;
    reasons.push("No completed gigs yet");
  } else if (params.completedDealsCount >= 1 && params.completedDealsCount <= 2) {
    score += 10;
    reasons.push("New user (1-2 completed gigs)");
  }
  // 3+ completed deals = Trusted badge = 0 additional risk
  // 10+ completed deals = Established badge = 0 additional risk

  // ── Deal amount ──
  if (params.dealAmount >= 200000) { // $2,000+
    score += 25;
    reasons.push(`High value gig ($${(params.dealAmount / 100).toFixed(0)})`);
  } else if (params.dealAmount >= 100000) { // $1,000+
    score += 15;
    reasons.push(`Elevated value gig ($${(params.dealAmount / 100).toFixed(0)})`);
  } else if (params.dealAmount >= 50000) { // $500+
    score += 5;
    reasons.push(`Mid-range gig ($${(params.dealAmount / 100).toFixed(0)})`);
  }

  // ── Category "other" ──
  if (params.category === "other") {
    score += 10;
    reasons.push(`Category "Other": "${params.otherCategoryDescription || "none"}"`);
  }

  // ── Disposable email ──
  if (params.email) {
    const domain = params.email.split("@")[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      score += 25;
      reasons.push(`Disposable email domain: ${domain}`);
    }
  }

  // ── Risky keywords in content ──
  const fullText = `${params.title} ${params.description} ${params.deliverables || ""} ${params.otherCategoryDescription || ""}`;
  for (const pattern of RISKY_KEYWORDS) {
    const match = fullText.match(pattern);
    if (match) {
      score += 15;
      reasons.push(`Risky keyword detected: "${match[0]}"`);
      break; // Only count once — don't stack keyword penalties
    }
  }

  // ── Spam velocity ──
  if (params.recentDealCount >= 3) {
    score += 20;
    reasons.push(`Rapid gig creation (${params.recentDealCount} gigs in last hour)`);
  }

  // ── Cap at 100 ──
  score = Math.min(score, 100);

  // ── Established users (10+ deals) get an automatic pass ──
  if (params.completedDealsCount >= 10) {
    return { score: 0, shouldFlag: false, reasons: ["Established user — auto-approved"] };
  }

  // ── Trusted users (3+ deals) get reduced risk ──
  if (params.completedDealsCount >= 3) {
    score = Math.max(0, score - 20);
  }

  return {
    score,
    shouldFlag: score >= 40,
    reasons,
  };
}
