import { z } from 'zod';

/** Schema for setting a custom referral slug */
export const referralSlugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(20, 'Slug must be 20 characters or less')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Must be lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.'
    )
    .transform((s) => s.toLowerCase()),
});

/** Schema for requesting a payout */
export const referralPayoutSchema = z.object({
  method: z.enum(['platform_credit', 'manual']),
});

/** Validates a referral code format (REF-XXXXXX) */
export const referralCodeSchema = z
  .string()
  .regex(/^REF-[A-Z0-9]{6}$/, 'Invalid referral code format');

/** Optional referral code field on gig creation form — allows empty string */
export const optionalReferralCodeSchema = z
  .string()
  .regex(/^REF-[A-Z0-9]{6}$/)
  .optional()
  .or(z.literal(''));
