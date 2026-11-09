import { createHash, createHmac } from "node:crypto";
import { hitRateLimit, rateLimitOk } from "@/db/queries";
import { secretKey } from "@/lib/gib/secret";

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
  efatura: [[10, MIN], [50, 24 * 60 * MIN]], // up to 300 drafts per upload
  // GİB logins: per user, and per firm so repeated tries never lock a client's GİB account.
  gib: [[5, MIN], [60, 24 * 60 * MIN]],
  gibFirm: [[3, 10 * MIN], [12, 24 * 60 * MIN]],
  // Failed GİB logins per GİB user code, across every Accountie user: the app can never be used to guess or lock someone's
  // GİB login. Only failures count, so nobody can use up the bucket of a code someone else has stored and verified.
  gibCodeFail: [[2, 60 * MIN], [3, 24 * 60 * MIN]],
  // Counted (atomically) before the call: parallel requests for one code cannot all pass the failure check at once.
  gibCodeTry: [[1, MIN]],
  gibUserTry: [[1, MIN]], // one GİB check at a time per user, so parallel saves cannot pass the failure count together
  gibUserFail: [[5, 24 * 60 * MIN]], // failed GİB checks per Accountie user: no checking of leaked code/password lists
  gibPull: [[10, 60 * MIN], [40, 24 * 60 * MIN]], // per user and stored code
  gibNew: [[3, 24 * 60 * MIN]], // logins saved by accounts younger than a day
  gibGlobal: [[3000, 24 * 60 * MIN]], // GİB refusals across the app in a day (only failures fill it, so valid saves cannot use it up)
  gibIp: [[10, 24 * 60 * MIN]], // GİB refusals per network a day: no credential-list checking from a farm of accounts
  gibDelete: [[30, MIN]], // removing a stored login is never blocked by the pull/save budget
  gibTryIp: [[20, 24 * 60 * MIN]], // GİB checks per network a day (an *Ip kind: IPv6 counts per /64)
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

// GİB user codes are short numbers a plain hash would give back: they are keyed with a key derived from the server's secret
// (its own key, not the one that seals logins).
const keyOf = (kind: keyof typeof LIMITS, subject: string) => {
  const value = (kind.endsWith("Ip") ? ipBucket(subject) : subject).toLowerCase();
  const secret = kind.startsWith("gib") ? secretKey() : null;
  const mac = secret && createHmac("sha256", createHmac("sha256", secret).update("accountie:ratelimit:v1").digest());
  return `${kind}:${mac ? mac.update(value).digest("hex").slice(0, 32) : hash(value)}`;
};

/** true when allowed (and counts this attempt). Keys are hashed so the table never holds an e-mail address, IP or GİB code. */
export const allow = (kind: keyof typeof LIMITS, subject: string) => hitRateLimit(keyOf(kind, subject), LIMITS[kind]);

/** true while under the limit, without counting an attempt (for buckets that only failures fill). */
export const under = (kind: keyof typeof LIMITS, subject: string) => rateLimitOk(keyOf(kind, subject), LIMITS[kind]);
