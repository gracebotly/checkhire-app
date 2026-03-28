import Stripe from "stripe";

/**
 * Stripe client — bare initialization only.
 * CheckHire payment features (listing fees, escrow) are built in Slices 6-7.
 * This file exists so the stripe package import doesn't break other files.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : null;
