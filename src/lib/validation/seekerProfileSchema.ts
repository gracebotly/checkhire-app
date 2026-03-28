import { z } from "zod";

export const seekerProfileSchema = z.object({
  skills: z
    .array(z.string().min(1).max(100))
    .max(50, "Maximum 50 skills allowed")
    .default([]),
  years_experience: z.number().int().min(0).max(60).nullable().optional(),
  location_city: z.string().max(100).nullable().optional(),
  location_state: z.string().max(100).nullable().optional(),
  education_level: z.string().max(100).nullable().optional(),
  education_field: z.string().max(200).nullable().optional(),
});

export type SeekerProfileInput = z.infer<typeof seekerProfileSchema>;
