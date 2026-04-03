import { z } from "zod";

export const submitScamCheckSchema = z.object({
  url: z
    .string()
    .min(1, "Link is required")
    .max(2000, "Link too long")
    .refine(
      (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          // Allow URLs without protocol — we'll add https://
          try {
            new URL(`https://${val}`);
            return true;
          } catch {
            return false;
          }
        }
      },
      { message: "Please enter a valid URL" }
    ),
  email: z
    .string()
    .email("Please enter a valid email")
    .max(255)
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(1000, "Description too long")
    .optional()
    .or(z.literal("")),
});

export const adminCreateScamCheckSchema = z.object({
  url: z.string().min(1, "Link is required").max(2000),
  platform: z.enum(["reddit", "facebook", "discord", "twitter", "craigslist", "linkedin", "other"]).default("other"),
  submitted_by_email: z.string().max(255).optional().or(z.literal("")),
  submitted_by_name: z.string().max(255).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  source: z.enum(["website", "reddit_dm", "reddit_comment", "discord", "facebook", "email", "other"]).default("reddit_dm"),
});

export const adminUpdateScamCheckSchema = z.object({
  status: z.enum(["pending", "investigating", "safe", "suspicious", "confirmed_scam"]).optional(),
  verdict_notes: z.string().max(5000).optional(),
  verdict_summary: z.string().max(2000).optional(),
  published: z.boolean().optional(),
});

export type SubmitScamCheckInput = z.infer<typeof submitScamCheckSchema>;
export type AdminCreateScamCheckInput = z.infer<typeof adminCreateScamCheckSchema>;
export type AdminUpdateScamCheckInput = z.infer<typeof adminUpdateScamCheckSchema>;
