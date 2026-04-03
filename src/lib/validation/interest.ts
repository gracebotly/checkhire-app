import { z } from "zod";

export const screeningQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["yes_no", "short_text", "multiple_choice"]),
  text: z.string().min(5, "Question too short").max(200, "Question too long"),
  options: z.array(z.string().min(1).max(100)).max(4).optional(),
  dealbreaker_answer: z.string().max(100).optional(),
});

export const screeningQuestionsArraySchema = z
  .array(screeningQuestionSchema)
  .max(5, "Maximum 5 screening questions");

const screeningAnswerSchema = z.object({
  question_id: z.string(),
  answer: z.string().min(1, "Answer required").max(500),
});

export const submitInterestSchema = z.object({
  pitch_text: z
    .string()
    .min(20, "Pitch must be at least 20 characters")
    .max(1000, "Pitch cannot exceed 1000 characters"),
  portfolio_urls: z
    .array(z.string().url("Must be a valid URL").max(500))
    .max(3, "Maximum 3 portfolio links")
    .optional()
    .default([]),
  screening_answers: z.array(screeningAnswerSchema).optional().default([]),
  file_urls: z
    .array(
      z.object({
        file_url: z.string(),
        file_name: z.string(),
        file_size_bytes: z.number(),
      })
    )
    .max(3, "Maximum 3 files")
    .optional()
    .default([]),
});

export const interestActionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export const publicDealsQuerySchema = z.object({
  category: z
    .enum([
      "web_dev",
      "design",
      "writing",
      "video",
      "marketing",
      "virtual_assistant",
      "audio",
      "translation",
      "other",
    ])
    .optional(),
  min_amount: z.coerce.number().int().min(0).optional(),
  max_amount: z.coerce.number().int().min(0).optional(),
  funded_only: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  sort: z
    .enum(["newest", "highest_budget", "deadline_soonest"])
    .optional()
    .default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
});
