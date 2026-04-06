import { z } from "zod";
import { screeningQuestionsArraySchema } from "@/lib/validation/interest";

export const createDealSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    description: z
      .string()
      .max(2000),
    deliverables: z
      .string()
      .max(1000)
      .nullable()
      .optional(),
    is_draft: z.boolean().optional(),
    description_brief_url: z.string().max(500).nullable().optional(),
    deliverables_brief_url: z.string().max(500).nullable().optional(),
    total_amount: z
      .number()
      .int()
      .min(1000, "Minimum $10")
      .max(1000000, "Maximum $10,000"),
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
      .nullable(),
    other_category_description: z
      .string()
      .min(10, "Please describe the work (at least 10 characters)")
      .max(100, "Keep it brief (100 characters max)")
      .nullable()
      .optional(),
    payment_frequency: z
      .enum(["one_time", "weekly", "biweekly", "monthly"])
      .default("one_time"),
    deadline: z.string().nullable(),
    deal_type: z.enum(["private", "public"]).default("public"),
    acceptance_criteria: z
      .array(
        z.object({
          evidence_type: z.enum(["file", "screenshot", "link", "video", "text"]),
          description: z.string().min(3, "Description too short").max(200, "Description too long"),
        })
      )
      .min(1, "At least one proof of completion requirement is needed")
      .max(10, "Maximum 10 requirements"),
    has_milestones: z.boolean(),
    milestones: z
      .array(
        z.object({
          title: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          amount: z.number().int().min(100, "Minimum $1 per milestone"),
        })
      )
      .nullable(),
    template_id: z.string().uuid().nullable().optional(),
    screening_questions: screeningQuestionsArraySchema.optional().default([]),
    max_applicants: z
      .number()
      .int()
      .refine((v) => [15, 30, 50].includes(v), "Must be 15, 30, or 50")
      .default(15),
    referral_code: z.string().max(20).optional(),
    recipient_email: z.string().email().max(255).nullable().optional(),
    recipient_name: z.string().max(100).nullable().optional(),
  })
  .refine(
    (data) =>
      !data.has_milestones ||
      (data.milestones && data.milestones.length >= 2),
    { message: "At least 2 milestones required", path: ["milestones"] }
  )
  .refine(
    (data) => {
      if (!data.has_milestones || !data.milestones) return true;
      const sum = data.milestones.reduce((s, m) => s + m.amount, 0);
      return sum === data.total_amount;
    },
    {
      message: "Milestone amounts must equal total budget",
      path: ["milestones"],
    }
  )
  .refine(
    (data) =>
      data.category !== "other" || (data.other_category_description && data.other_category_description.trim().length >= 10),
    {
      message: "Please describe the type of work when selecting 'Other'",
      path: ["other_category_description"],
    }
  )
  .refine(
    (data) => data.is_draft || (data.description && data.description.trim().length >= 1),
    { message: "Description is required", path: ["description"] }
  )
  .refine(
    (data) => data.is_draft || (data.deliverables && data.deliverables.trim().length >= 1),
    { message: "Deliverables are required", path: ["deliverables"] }
  );

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  profile_slug: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9-]+$/,
      "Lowercase letters, numbers, and hyphens only"
    )
    .optional(),
  avatar_url: z.string().url().optional().nullable(),
});

export const createTemplateSchema = z.object({
  template_name: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  deliverables: z.string().max(1000).optional(),
  default_amount: z.number().int().min(1000).max(1000000).nullable(),
  default_deadline_days: z.number().int().min(1).max(365).nullable(),
  has_milestones: z.boolean(),
  milestone_templates: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        amount_percentage: z.number().min(0).max(100),
      })
    )
    .optional(),
});

export const updateDealSlugSchema = z.object({
  slug: z
    .string()
    .min(3, "Minimum 3 characters")
    .max(60, "Maximum 60 characters")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Lowercase letters, numbers, and hyphens only. Must start and end with a letter or number."
    )
    .refine((s) => !s.includes("--"), "No consecutive hyphens"),
});
