import { z } from "zod";

export const BLOCKED_KEYWORDS = [
  "ssn",
  "social security",
  "social security number",
  "bank account",
  "bank routing",
  "routing number",
  "credit card",
  "card number",
  "date of birth",
  "dob",
  "passport number",
  "driver license",
  "drivers license",
  "driver's license",
  "maiden name",
  "mother's maiden",
];

export const screeningQuestionSchema = z.object({
  question_text: z
    .string()
    .min(5, "Question must be at least 5 characters")
    .max(500, "Question must be under 500 characters"),
  question_type: z.enum(["multiple_choice", "short_answer", "yes_no", "numerical"]),
  options: z.array(z.string()).nullable(),
  required: z.boolean().default(true),
  sort_order: z.number().int().min(0),
});

export type ScreeningQuestionInput = z.infer<typeof screeningQuestionSchema>;

/**
 * Check if a question contains blocked keywords (SSN, bank info, etc.)
 * Returns the matched keyword or null if clean.
 */
export function detectBlockedKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lower.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}
