import { z } from "zod";

export const submitRatingSchema = z.object({
  stars: z.number().int().min(1, "Minimum 1 star").max(5, "Maximum 5 stars"),
  comment: z.string().max(500, "Comment too long").optional().nullable(),
});
