import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  randomInt,
} from "node:crypto";
import bcrypt from "bcryptjs";

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "sentinel-mfa-salt", 32);
}

const SECRET = process.env["SESSION_SECRET"] ?? "dev-only-secret-change-me";
const ENCRYPTION_KEY = deriveKey(SECRET);

const ALGO = "aes-256-gcm";

export function encryptString(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptString(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !encB64) {
    throw new Error("Malformed encrypted payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv(ALGO, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, 12);
}

export async function verifySecret(
  value: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

export function generateOtp(): string {
  // 6 digit numeric, zero-padded
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
