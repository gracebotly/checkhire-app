import { z } from "zod";

export const createApplicationSchema = z.object({
  job_listing_id: z.string().uuid("Invalid listing ID"),
  screening_responses: z.record(z.unknown()).optional(),
  video_responses: z.array(z.object({
    question_index: z.number(),
    video_url: z.string(),
    recorded_at: z.string(),
  })).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
