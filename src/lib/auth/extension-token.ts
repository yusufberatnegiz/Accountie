import { createHash, randomBytes } from "node:crypto";
import { userIdForTokenHash } from "@/db/queries";
import { mac, secretKey } from "@/lib/gib/secret";

/** Sliding: every accepted request moves the expiry this far ahead, so a key in daily use never runs out and a forgotten one dies. */
export const EXTENSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TOKEN_PATTERN = /^Bearer (acx_[A-Za-z0-9_-]{43})$/;

/** 256-bit random token; shown to the user once, only its hash is stored. */
export const newExtensionToken = () => `acx_${randomBytes(32).toString("base64url")}`;

/** The key's plain hash, as stored before keyed hashes: still signs the extension in, never earns an e-Tebligat approval. */
export const legacyHash = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * The stored form of a key: a MAC under the server's key ("h1:"), so a row written straight into the database never matches a
 * key anyone holds; the plain hash only while the server has no key.
 */
export function hashToken(token: string): string {
  const key = secretKey();
  return key ? `h1:${mac(key, "token", token)}` : legacyHash(token);
}

/** A stored hash made with the server's key: only such a key is ever bound to an e-Tebligat approval. */
export const keyedHash = (hash: string) => hash.startsWith("h1:");

/** The hash of the request's extension key, or null: the e-Tebligat approval is bound to one key. */
export function bearerHash(request: Request): string | null {
  const token = TOKEN_PATTERN.exec(request.headers.get("authorization") ?? "")?.[1];
  return token ? hashToken(token) : null;
}

/** User id for a valid `Authorization: Bearer acx_...` header. Cookies are ignored on purpose. */
export async function extensionUserId(request: Request): Promise<string | null> {
  const token = TOKEN_PATTERN.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return null;
  const hash = hashToken(token);
  const userId = await userIdForTokenHash(hash, EXTENSION_TOKEN_TTL_MS);
  if (userId || !keyedHash(hash)) return userId;
  // A key paired before keyed hashes still works for receipts and firms. It is never rewritten to the keyed form: a plain hash
  // anyone could have written into the database must not turn into one the e-Tebligat approval trusts (re-pairing does that).
  return userIdForTokenHash(legacyHash(token), EXTENSION_TOKEN_TTL_MS);
}
