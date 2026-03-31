import crypto from 'crypto';

export function generateVerificationCode(): { code: string; hash: string } {
  const code = crypto.randomInt(100000, 999999).toString();
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  return { code, hash };
}

export function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
