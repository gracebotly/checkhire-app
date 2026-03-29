import Stripe from "stripe";

/**
 * Stripe client for CheckHire escrow platform.
 * Used for: Stripe Connect Express (freelancer payouts),
 * Stripe Checkout (escrow funding), Stripe Transfers (fund release),
 * and Instant Payouts.
 * Full integration in Slice 2.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : null;
