const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Public site key for the widget; read on the server so it needs no NEXT_PUBLIC_ build-time value. */
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || undefined;

/**
 * Server-side Cloudflare Turnstile check for public forms.
 * Without TURNSTILE_SECRET_KEY it passes only outside Vercel production (local dev, tests, previews); production fails closed.
 */
export async function verifyTurnstile(token: unknown, ip: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.VERCEL_ENV !== "production") return true;
    console.error("TURNSTILE_SECRET_KEY eksik: giriş ve kayıt kapalı.");
    return false;
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  try {
    const res = await fetchImpl(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip !== "unknown" ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    const body = (await res.json()) as { success?: unknown };
    return body.success === true;
  } catch {
    return false; // fail closed: no answer from Cloudflare is no proof of a human
  }
}
