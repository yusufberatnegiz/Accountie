import { createHash } from "node:crypto";
import { hitRateLimit } from "@/db/queries";

const MIN = 60_000;

// [limit, window] pairs; no window may exceed one day (hitRateLimit sweeps older rows). Login: ~10 tries / 15 min per IP and per e-mail, as OWASP suggests; *Ip kinds are keyed by ipBucket.
export const LIMITS = {
  receipt: [[10, MIN], [100, 24 * 60 * MIN]],
  // Accounts younger than a day, so a batch of fresh sign-ups cannot drain receiptGlobal for everyone.
  receiptNew: [[10, MIN], [20, 24 * 60 * MIN]],
  // Per network (IPv6 /64), sized for one office of accountants behind a shared address.
  receiptIp: [[300, 24 * 60 * MIN]],
  // Ceiling on vision-model spend across all accounts, since signup is open. Also set a spend limit in the Anthropic console.
  receiptGlobal: [[2000, 24 * 60 * MIN]],
  loginIp: [[10, 15 * MIN]],
  // Always on, against guessing from rotating IPs. Above one IP's hourly loginIp budget (40) so a single address cannot lock a victim out;
  // locking needs several networks, which Turnstile (set TURNSTILE_SECRET_KEY in production) stops.
  loginEmail: [[100, 60 * MIN]],
  signupIp: [[5, 60 * MIN]],
  // Password reset: each request sends an e-mail. Per network, and per address so one inbox cannot be flooded.
  resetIp: [[10, 60 * MIN]],
  resetEmail: [[3, 60 * MIN]],
  // Muavin check: parsing an uploaded Excel costs CPU, nothing else; generous for a müşavir closing many firms.
  reconcile: [[30, MIN], [600, 24 * 60 * MIN]],
} as const;

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);

/** Client IP as set by Vercel's edge (it overwrites x-forwarded-for, so clients cannot spoof the first hop). */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Rate-limit subject for an IP: IPv6 is cut to its /64, since one host usually owns a whole /64 and could rotate through it.
 * IPv4-mapped IPv6 is treated as IPv4.
 */
export function ipBucket(ip: string): string {
  if (!ip.includes(":")) return ip;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1];
  const [h, t] = ip.toLowerCase().split("%")[0].split("::");
  const head = h ? h.split(":") : [];
  const tail = t ? t.split(":") : [];
  const groups = [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail];
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":") + "::/64";
}

/** true when allowed. Keys are hashed so the table never holds an e-mail address or IP. */
export const allow = (kind: keyof typeof LIMITS, subject: string) => {
  const key = kind.endsWith("Ip") ? ipBucket(subject) : subject;
  return hitRateLimit(`${kind}:${hash(key.toLowerCase())}`, LIMITS[kind]);
};
