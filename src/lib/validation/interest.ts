import { z } from "zod";

export const submitInterestSchema = z.object({
  pitch_text: z
    .string()
    .min(20, "Pitch must be at least 20 characters")
    .max(500, "Pitch cannot exceed 500 characters"),
});

export const interestActionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export const publicDealsQuerySchema = z.object({
  category: z
    .enum(["web_dev", "design", "writing", "video", "marketing", "virtual_assistant", "audio", "translation", "other"])
    .optional(),
  min_amount: z.coerce.number().int().min(0).optional(),
  max_amount: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["newest", "highest_budget", "deadline_soonest"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
});
