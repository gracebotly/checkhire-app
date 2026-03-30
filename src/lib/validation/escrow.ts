import { z } from "zod";

export const checkoutSchema = z.object({
  deal_id: z.string().uuid(),
  milestone_id: z.string().uuid().optional(),
  fund_all: z.boolean().optional().default(false),
});

export const submitWorkSchema = z.object({
  milestone_id: z.string().uuid().optional(),
});

export const confirmDeliverySchema = z.object({
  milestone_id: z.string().uuid().optional(),
});

export const revisionSchema = z.object({
  notes: z.string().min(1, "Revision notes required").max(1000),
  milestone_id: z.string().uuid().optional(),
});

export const milestoneProposalSchema = z.object({
  proposal_type: z.enum(["add", "modify", "remove"]),
  milestone_id: z.string().uuid().optional(),
  title: z.string().min(1).max(100).optional(),
  amount: z.number().int().min(100).optional(),
  description: z.string().max(500).optional(),
});

export const proposalActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export const instantPayoutSchema = z.object({
  amount: z.number().int().min(100, "Minimum $1"),
});
