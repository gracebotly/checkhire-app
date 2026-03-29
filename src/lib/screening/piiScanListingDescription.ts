/**
 * PII scanner for job listing descriptions.
 * Runs before a listing is saved to prevent employers from
 * requesting sensitive information in the job description itself.
 *
 * This is separate from the chat PII detection (which is a soft warning).
 * Description PII scanning is a HARD BLOCK — the listing is not created.
 */

const DESCRIPTION_PII_PATTERNS: { pattern: RegExp; warning: string }[] = [
  {
    pattern: /(?:send|provide|include|share|submit)\s+(?:your\s+)?(?:ssn|social security)/i,
    warning: "Listing descriptions cannot request Social Security Numbers.",
  },
  {
    pattern: /(?:send|provide|include|share|submit)\s+(?:your\s+)?(?:bank\s+(?:account|details|info)|routing\s+number)/i,
    warning: "Listing descriptions cannot request banking information.",
  },
  {
    pattern: /(?:send|provide|include|share|submit)\s+(?:your\s+)?(?:credit\s+card|card\s+number)/i,
    warning: "Listing descriptions cannot request credit card information.",
  },
  {
    pattern: /(?:send|provide|include|share|submit)\s+(?:your\s+)?(?:date\s+of\s+birth|dob|birth\s+date)/i,
    warning: "Listing descriptions cannot request date of birth.",
  },
  {
    pattern: /(?:send|provide|include|share|submit)\s+(?:your\s+)?(?:passport|driver'?s?\s+licen[sc]e)/i,
    warning: "Listing descriptions cannot request identity documents.",
  },
  {
    pattern: /(?:send|provide|include|share|submit)\s+(?:your\s+)?(?:resume|cv)\s+(?:to|at|via)\s+[\w.+-]+@/i,
    warning: "Do not ask candidates to email resumes directly. Resumes are handled through the platform.",
  },
  {
    pattern: /(?:email|contact|reach\s+out\s+to)\s+(?:us|me)\s+(?:at|via)\s+[\w.+-]+@/i,
    warning: "Do not include personal email addresses. All communication flows through CheckHire.",
  },
  {
    pattern: /(?:pay|fee|cost|charge|deposit)\s+(?:of\s+)?\$?\d+\s+(?:to\s+(?:start|begin|apply|register)|(?:upfront|before|required))/i,
    warning: "Listings cannot require applicants to pay fees to apply or start working.",
  },
  {
    pattern: /(?:purchase|buy)\s+(?:a\s+)?(?:starter\s+kit|inventory|supplies|materials)\s+(?:to\s+(?:begin|start|get\s+started))?/i,
    warning: "Listings cannot require applicants to purchase kits or inventory. This is an MLM indicator.",
  },
];

export type DescriptionPiiResult = {
  flagged: boolean;
  warnings: string[];
};

/**
 * Scans a listing description for PII requests and prohibited content.
 *
 * @param description - The job listing description text
 * @returns Object with flagged boolean and array of warning messages
 */
export function scanListingDescription(description: string): DescriptionPiiResult {
  const warnings: string[] = [];

  for (const { pattern, warning } of DESCRIPTION_PII_PATTERNS) {
    if (pattern.test(description)) {
      warnings.push(warning);
    }
  }

  return {
    flagged: warnings.length > 0,
    warnings,
  };
}
