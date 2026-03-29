import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment.
 * Must be a 64-character hex string (32 bytes).
 *
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getKey(): Buffer {
  const hex = process.env.PII_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "[piiEncrypt] PII_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded).
 * This format is safe to store in a TEXT column.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in iv:authTag:ciphertext format
 */
export function encryptPii(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with encryptPii.
 *
 * @param ciphertext - The encrypted string in iv:authTag:ciphertext format
 * @returns The original plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, malformed input)
 */
export function decryptPii(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("[piiEncrypt] Malformed ciphertext — expected iv:authTag:encrypted format");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Checks if a string looks like it's already encrypted (iv:authTag:ciphertext format).
 * Useful for migration scenarios where some data may already be encrypted.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  // Each part should be hex
  return parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
