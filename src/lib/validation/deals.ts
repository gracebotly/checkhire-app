import { z } from "zod";

export const createDealSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(2000),
    deliverables: z
      .string()
      .min(1, "Deliverables are required")
      .max(1000),
    total_amount: z
      .number()
      .int()
      .min(1000, "Minimum $10")
      .max(1000000, "Maximum $10,000"),
    category: z
      .enum([
        "design",
        "development",
        "writing",
        "marketing",
        "virtual_assistant",
        "other",
      ])
      .nullable(),
    deadline: z.string().nullable(),
    deal_type: z.enum(["private", "public"]),
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
