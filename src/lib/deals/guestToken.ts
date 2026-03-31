import crypto from 'crypto';

const SECRET = process.env.GUEST_TOKEN_SECRET || '';

export function generateGuestToken(dealId: string, email: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${dealId}:${email.toLowerCase()}:${issuedAt}`;
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  return `${signature}:${issuedAt}`;
}

export function verifyGuestToken(token: string, dealId: string, email: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 2) return false;

  const [signature, issuedAtStr] = parts;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return false;

  // Reject tokens older than 30 days
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > thirtyDaysInSeconds) return false;

  const payload = `${dealId}:${email.toLowerCase()}:${issuedAt}`;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}
