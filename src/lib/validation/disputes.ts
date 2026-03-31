import { z } from "zod";

// ─── Existing schemas (used by current routes) ───

export const openDisputeSchema = z.object({
  category: z.enum([
    'not_delivered', 'wrong_deliverables', 'incomplete_work',
    'quality_mismatch', 'communication_issues', 'other'
  ]),
  reason: z.string().min(50, "Describe the problem in at least 50 characters").max(2000),
  proposed_percentage: z.number().int().min(0).max(100),
  justification: z.string().min(50, "Explain why this split is fair (at least 50 characters)").max(2000),
  guest_token: z.string().optional(),
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

// ─── New schemas for dispute proposals + guest flows ───

export const disputeRespondSchema = z.object({
  proposed_percentage: z.number().int().min(0).max(100),
  justification: z.string().min(50).max(2000),
  guest_token: z.string().optional(),
});

export const disputeNegotiateSchema = z.object({
  proposed_percentage: z.number().int().min(0).max(100),
  guest_token: z.string().optional(),
});

export const guestVerifySchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Name required").max(50),
});

export const guestAcceptSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Name required").max(50),
  code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
});
