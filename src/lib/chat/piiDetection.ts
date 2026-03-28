/**
 * PII keyword detection for chat messages.
 *
 * Scans message text for patterns that suggest the sender is trying to
 * collect personal information outside the platform. This is a SOFT warning —
 * the message is still sent, but the API response includes a warning flag
 * and the message is flagged in the audit log.
 *
 * Part of Anti-Data Harvesting Layer 6 (behavioral detection).
 */

const PII_PATTERNS: { pattern: RegExp; warning: string }[] = [
  {
    pattern: /what(?:'?s| is) your (?:real |personal )?(?:email|e-mail)/i,
    warning: "Asking for email addresses is not allowed. All communication stays on-platform.",
  },
  {
    pattern: /send (?:me |us )?your (?:phone|email|number|contact)/i,
    warning: "Requesting contact information is not allowed. Use in-app messaging.",
  },
  {
    pattern: /(?:personal|private|real|direct) (?:email|phone|number|cell|contact)/i,
    warning: "Personal contact details are protected. Communication stays on-platform.",
  },
  {
    pattern: /what(?:'?s| is) your (?:phone|cell|mobile) number/i,
    warning: "Phone numbers are not shared on CheckHire. Use in-app messaging.",
  },
  {
    pattern: /(?:contact|reach|text|call|message|email) (?:me|us|you) (?:at|on|via|outside|directly)/i,
    warning: "Off-platform communication is discouraged. All messages should stay on CheckHire.",
  },
  {
    pattern: /off[- ]?platform/i,
    warning: "Off-platform communication is discouraged for your protection.",
  },
  {
    pattern: /(?:social security|ssn|bank account|routing number|credit card)/i,
    warning: "Requesting sensitive financial or identity information is prohibited.",
  },
  {
    pattern: /(?:date of birth|passport number|driver'?s? license)/i,
    warning: "Requesting identity documents is prohibited before a verified hire.",
  },
  {
    pattern: /(?:what(?:'?s| is) your (?:full |last )?name)/i,
    warning: "Candidate names are revealed through the progressive disclosure system.",
  },
  {
    pattern: /(?:send|share|give) (?:me |us )?your (?:resume|cv) (?:directly|via email|outside)/i,
    warning: "Resumes are shared through the platform at the appropriate hiring stage.",
  },
];

export type PiiDetectionResult = {
  flagged: boolean;
  warnings: string[];
};

/**
 * Scans a message for PII-request patterns.
 *
 * @param text - The message text to scan
 * @returns Object with flagged boolean and array of warning messages
 */
export function detectPiiRequests(text: string): PiiDetectionResult {
  const warnings: string[] = [];

  for (const { pattern, warning } of PII_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push(warning);
    }
  }

  return {
    flagged: warnings.length > 0,
    warnings,
  };
}
