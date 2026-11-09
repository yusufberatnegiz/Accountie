import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Seals a firm's GİB login with AES-256-GCM. The 32-byte key is the server's GIB_SECRET_KEY (base64), read at run time and
 * never inlined into a build or sent to a browser; without a valid key the feature is off (fail closed). The additional
 * data binds each value to its user, firm and field, so a sealed value moved to another row or field does not open.
 * Format: "v2.<key id>.<iv>.<tag>.<ciphertext>", base64url; the key id (a hash prefix of the key) tells a value sealed with
 * another key (SecretError "key": the login is kept) from a damaged one (SecretError "open"). The plaintext is padded to a
 * fixed length so the stored size does not tell how long a password is.
 * shortcut: one key, no key ring; rotating means re-entering the logins. Add a ring keyed by the id when a rotation is needed.
 */
export class SecretError extends Error {}

const PREFIX = "v2";
const PADDED = 260; // 2 length bytes + up to 64 characters of UTF-8 (4 bytes each), rounded up
const keyId = (key: Buffer) => createHash("sha256").update(key).digest("base64url").slice(0, 8);

export function secretKey(): Buffer | null {
  const raw = process.env[`GIB_${"SECRET_KEY"}`];
  if (!raw || !/^[A-Za-z0-9+/]{43}=$/.test(raw.trim())) return null;
  const key = Buffer.from(raw.trim(), "base64");
  // A placeholder (a few repeated byte values) is not a key.
  return key.length === 32 && new Set(key).size > 4 ? key : null;
}

export const secretContext = (userId: string, firmId: string, field: "kullanici" | "sifre") => `gib:${userId}:${firmId}:${field}`;

export function seal(key: Buffer, plain: string, context: string): string {
  const text = Buffer.from(plain, "utf8");
  if (text.length > PADDED - 2) throw new SecretError("length");
  const padded = Buffer.alloc(PADDED);
  padded.writeUInt16BE(text.length, 0);
  text.copy(padded, 2);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const body = Buffer.concat([cipher.update(padded), cipher.final()]);
  return [PREFIX, keyId(key), ...[iv, cipher.getAuthTag(), body].map((p) => p.toString("base64url"))].join(".");
}

export function open(key: Buffer, sealed: string, context: string): string {
  const [prefix, id, iv, tag, body] = sealed.split(".");
  if (prefix !== PREFIX || !id || !iv || !tag || body === undefined) throw new SecretError("open");
  if (id !== keyId(key)) throw new SecretError("key");
  const ivBytes = Buffer.from(iv, "base64url"), tagBytes = Buffer.from(tag, "base64url");
  if (ivBytes.length !== 12 || tagBytes.length !== 16) throw new SecretError("open");
  let padded: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, ivBytes, { authTagLength: 16 });
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(tagBytes);
    padded = Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]);
  } catch {
    throw new SecretError("open");
  }
  const length = padded.length === PADDED ? padded.readUInt16BE(0) : -1;
  if (length < 0 || length > PADDED - 2) throw new SecretError("open");
  return padded.subarray(2, 2 + length).toString("utf8");
}
