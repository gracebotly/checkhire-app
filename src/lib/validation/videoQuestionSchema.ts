import { z } from "zod";

export const videoQuestionSchema = z.object({
  prompt: z
    .string()
    .min(10, "Video prompt must be at least 10 characters")
    .max(500, "Video prompt must be under 500 characters"),
  time_limit_seconds: z
    .number()
    .int()
    .min(30, "Minimum recording time is 30 seconds")
    .max(120, "Maximum recording time is 120 seconds"),
  max_retakes: z
    .number()
    .int()
    .min(0, "Retakes cannot be negative")
    .max(3, "Maximum 3 retakes allowed"),
});

export const videoQuestionsArraySchema = z
  .array(videoQuestionSchema)
  .max(5, "Maximum 5 video questions per listing");

export type VideoQuestionInput = z.infer<typeof videoQuestionSchema>;
