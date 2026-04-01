/**
 * Generates a unique 6-character referral code in format REF-XXXXXX.
 * Uses characters that avoid visual ambiguity (no I, O, 0, 1).
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-${code}`;
}
