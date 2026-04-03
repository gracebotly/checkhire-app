import { z } from "zod";

const platformOptions = [
  "reddit",
  "facebook",
  "indeed",
  "linkedin",
  "discord",
  "whatsapp",
  "craigslist",
  "twitter",
  "other",
] as const;

const scamTypeOptions = [
  "company_impersonation",
  "upfront_payment",
  "too_good_to_be_true",
  "personal_info_harvesting",
  "crypto_gift_card",
  "not_sure",
  "other",
] as const;

const sourceOptions = [
  "website",
  "reddit_dm",
  "reddit_comment",
  "discord",
  "facebook",
  "email",
  "other",
] as const;

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
    .min(1, "Email is required")
    .email("Please enter a valid email")
    .max(255),
  platform: z.enum(platformOptions, {
    errorMap: () => ({ message: "Please select where you found this posting" }),
  }),
  scam_type: z.enum(scamTypeOptions).default("not_sure"),
  description: z
    .string()
    .max(1000, "Description too long")
    .optional()
    .or(z.literal("")),
});

export const adminCreateScamCheckSchema = z.object({
  url: z.string().min(1, "Link is required").max(2000),
  platform: z.enum(platformOptions).default("other"),
  submitted_by_email: z.string().min(1, "Email is required").email().max(255),
  submitted_by_name: z.string().max(255).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  scam_type: z.enum(scamTypeOptions).default("not_sure"),
  source: z.enum(sourceOptions).default("reddit_dm"),
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
