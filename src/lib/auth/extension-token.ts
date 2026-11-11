import { createHash, randomBytes } from "node:crypto";
import { userIdForTokenHash } from "@/db/queries";

/** Sliding: every accepted request moves the expiry this far ahead, so a key in daily use never runs out and a forgotten one dies. */
export const EXTENSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TOKEN_PATTERN = /^Bearer (acx_[A-Za-z0-9_-]{43})$/;

/** 256-bit random token; shown to the user once, only its hash is stored. */
export const newExtensionToken = () => `acx_${randomBytes(32).toString("base64url")}`;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** User id for a valid `Authorization: Bearer acx_...` header. Cookies are ignored on purpose. */
export async function extensionUserId(request: Request): Promise<string | null> {
  const token = TOKEN_PATTERN.exec(request.headers.get("authorization") ?? "")?.[1];
  return token ? userIdForTokenHash(hashToken(token), EXTENSION_TOKEN_TTL_MS) : null;
}
