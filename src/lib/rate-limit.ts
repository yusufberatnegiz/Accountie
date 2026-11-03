import { createHash } from "node:crypto";
import { hitRateLimit } from "@/db/queries";

const MIN = 60_000;

// [limit, window] pairs; no window may exceed one day (hitRateLimit sweeps older rows). Login: ~10 tries / 15 min per IP and per e-mail, as OWASP suggests.
export const LIMITS = {
  receipt: [[10, MIN], [100, 24 * 60 * MIN]],
  // Ceiling on vision-model spend across all accounts, since signup is open. Also set a spend limit in the Anthropic console.
  receiptGlobal: [[2000, 24 * 60 * MIN]],
  loginIp: [[10, 15 * MIN]],
  loginEmail: [[10, 15 * MIN]],
  signupIp: [[5, 60 * MIN]],
} as const;

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);

/** Client IP as set by Vercel's edge (it overwrites x-forwarded-for, so clients cannot spoof the first hop). */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** true when allowed. Keys are hashed so the table never holds an e-mail address or IP. */
export const allow = (kind: keyof typeof LIMITS, subject: string) => hitRateLimit(`${kind}:${hash(subject.toLowerCase())}`, LIMITS[kind]);
