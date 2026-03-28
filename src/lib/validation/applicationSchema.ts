import { z } from "zod";

export const createApplicationSchema = z.object({
  job_listing_id: z.string().uuid("Invalid listing ID"),
  screening_responses: z.record(z.unknown()).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
