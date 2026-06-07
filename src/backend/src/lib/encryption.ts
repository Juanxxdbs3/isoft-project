import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const HMAC_ALGORITHM = "sha256";

/**
 * Encrypts a student code using AES-256-GCM.
 *
 * Format: `hmac_hash:iv:ciphertext:auth_tag`
 * - `hmac_hash`: first 32 hex chars of HMAC-SHA256 (16 bytes) — deterministic,
 *   used for fast uniqueness lookups without decrypting all records.
 * - `iv`: 32 hex chars (16 bytes) — random initialization vector.
 * - `ciphertext`: hex-encoded AES-256-GCM output.
 * - `auth_tag`: 32 hex chars (16 bytes) — GCM authentication tag.
 *
 * The HMAC prefix enables application-level dedup: we can check if a student
 * code is already registered by comparing HMAC prefixes, then fully decrypt
 * to confirm (handling the unlikely hash collision).
 */
export function encryptStudentCode(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");

  if (key.length !== 32) {
    throw new Error(
      `Encryption key must be 32 bytes (64 hex chars), got ${key.length} bytes`
    );
  }

  // Deterministic HMAC uniqueness prefix
  const hash = createHmac(HMAC_ALGORITHM, key)
    .update(plaintext, "utf8")
    .digest("hex")
    .substring(0, 32);

  // Random IV for encryption
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${hash}:${iv.toString("hex")}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a student code that was encrypted with `encryptStudentCode`.
 */
export function decryptStudentCode(encoded: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");

  const parts = encoded.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted student code format");
  }

  const iv = Buffer.from(parts[1], "hex");
  const encrypted = parts[2] as string;
  const authTag = Buffer.from(parts[3], "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length in encrypted student code");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Extracts the deterministic HMAC prefix from an encrypted student code.
 * Used for fast uniqueness lookups.
 */
export function getStudentCodeHash(encoded: string): string {
  return encoded.split(":")[0] as string;
}

/**
 * Computes the HMAC of a plaintext student code using the encryption key.
 */
export function computeStudentCodeHash(
  plaintext: string,
  keyHex: string
): string {
  const key = Buffer.from(keyHex, "hex");
  return createHmac(HMAC_ALGORITHM, key)
    .update(plaintext, "utf8")
    .digest("hex")
    .substring(0, 32);
}
