import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Seals a firm's GİB login with AES-256-GCM. The 32-byte key is the server's GIB_SECRET_KEY (base64), read at run time and
 * never inlined into a build or sent to a browser; without a valid key the feature is off (fail closed). The additional
 * data binds each value to its user, firm and field, so a sealed value moved to another row or field does not open.
 * Format: "v1.<iv>.<tag>.<ciphertext>", base64url. Rotating the key means re-entering the logins (shortcut: no key ring yet,
 * add a key id to the prefix when a rotation is needed).
 */
export class SecretError extends Error {}

const PREFIX = "v1";

export function secretKey(): Buffer | null {
  const raw = process.env[`GIB_${"SECRET_KEY"}`];
  if (!raw || !/^[A-Za-z0-9+/]{43}=$/.test(raw.trim())) return null;
  const key = Buffer.from(raw.trim(), "base64");
  return key.length === 32 ? key : null;
}

export const secretContext = (userId: string, firmId: string, field: "kullanici" | "sifre") => `gib:${userId}:${firmId}:${field}`;

export function seal(key: Buffer, plain: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [PREFIX, iv, cipher.getAuthTag(), body].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function open(key: Buffer, sealed: string, context: string): string {
  const [prefix, iv, tag, body] = sealed.split(".");
  if (prefix !== PREFIX || !iv || !tag || body === undefined) throw new SecretError("format");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"), { authTagLength: 16 });
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new SecretError("open");
  }
}
