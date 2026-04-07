import { z } from "zod";

export const createCancellationRequestSchema = z
  .object({
    proposed_client_refund_cents: z.number().int().min(0),
    proposed_freelancer_payout_cents: z.number().int().min(0),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      data.proposed_client_refund_cents + data.proposed_freelancer_payout_cents > 0,
    { message: "Total split must be greater than zero" }
  );

export const respondCancellationRequestSchema = z.object({
  action: z.enum(["accept", "reject", "escalate"]),
  response_reason: z.string().max(500).optional(),
  // For escalate: the responder must provide dispute fields, mirroring openDisputeSchema
  dispute_category: z
    .enum([
      "not_delivered",
      "wrong_deliverables",
      "incomplete_work",
      "quality_mismatch",
      "communication_issues",
      "other",
    ])
    .optional(),
  dispute_reason: z.string().min(50).max(2000).optional(),
  dispute_proposed_percentage: z.number().int().min(0).max(100).optional(),
  dispute_justification: z.string().min(50).max(2000).optional(),
});

export type CreateCancellationRequestInput = z.infer<
  typeof createCancellationRequestSchema
>;
export type RespondCancellationRequestInput = z.infer<
  typeof respondCancellationRequestSchema
>;
