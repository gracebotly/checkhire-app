import { z } from "zod";

export const JOB_CATEGORIES = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Customer Support",
  "Operations",
  "Finance",
  "Legal",
  "Human Resources",
  "Data Science",
  "DevOps",
  "Content",
  "Education",
  "Healthcare",
  "Other",
] as const;

export const commissionStructureSchema = z.object({
  commission_percentage: z.number().min(0).max(100).optional(),
  commission_basis: z.string().optional(),
  average_earnings: z.number().min(0).optional(),
  time_to_first_payment: z.string().optional(),
  leads_provided: z.boolean().optional(),
});

export const createListingSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(120, "Title must be under 120 characters"),
    description: z
      .string()
      .min(50, "Description must be at least 50 characters")
      .max(10000, "Description must be under 10,000 characters"),
    job_type: z.enum(["gig", "temp", "full_time", "part_time", "contract"]),
    category: z.string().min(1, "Category is required"),
    pay_type: z.enum(["hourly", "salary", "project", "commission"]),
    salary_min: z.number().int().min(0).nullable(),
    salary_max: z.number().int().min(0).nullable(),
    commission_structure: commissionStructureSchema.nullable(),
    ote_min: z.number().int().min(0).nullable(),
    ote_max: z.number().int().min(0).nullable(),
    is_100_percent_commission: z.boolean(),
    remote_type: z.enum(["full_remote", "hybrid", "onsite"]),
    location_city: z.string().optional(),
    location_state: z.string().optional(),
    location_country: z.string().default("US"),
    timezone_requirements: z.string().optional(),
    equipment_policy: z.string().optional(),
    respond_by_date: z.string().optional(),
    fill_by_date: z.string().optional(),
    max_applications: z.number().int().min(10).max(200).default(100),
    requires_video_application: z.boolean().default(false),
    requires_screening_quiz: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Salary range: if both provided, max >= min
      if (data.salary_min != null && data.salary_max != null) {
        return data.salary_max >= data.salary_min;
      }
      return true;
    },
    { message: "Maximum salary must be greater than or equal to minimum", path: ["salary_max"] }
  )
  .refine(
    (data) => {
      // Non-commission roles must have salary
      if (data.pay_type !== "commission" && !data.is_100_percent_commission) {
        return data.salary_min != null || data.salary_max != null;
      }
      return true;
    },
    { message: "Salary range is required for non-commission roles", path: ["salary_min"] }
  );

export type CreateListingInput = z.infer<typeof createListingSchema>;
