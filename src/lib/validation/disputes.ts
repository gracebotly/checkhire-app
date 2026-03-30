import { z } from "zod";

export const openDisputeSchema = z.object({
  reason: z
    .string()
    .min(1, "Please describe the problem")
    .max(2000, "Reason too long (max 2000 characters)"),
});

export const submitEvidenceSchema = z.object({
  evidence_type: z.enum(["screenshot", "file", "video", "text", "link"]),
  description: z.string().max(2000).optional(),
  content: z.string().max(2000).optional(),
  url: z.string().url("Invalid URL").optional(),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(["release", "refund", "partial"]),
  resolution_notes: z
    .string()
    .min(1, "Resolution notes are required")
    .max(5000),
  resolution_amount: z.number().int().min(0).optional(),
  apply_dispute_fee: z.boolean(),
});

export const updateDisputeStatusSchema = z.object({
  status: z.enum(["under_review"]),
});

export const suspendUserSchema = z.object({
  action: z.enum(["suspend", "unsuspend"]),
});
