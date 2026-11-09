const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Public site key for the widget; read on the server so it needs no NEXT_PUBLIC_ build-time value. */
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || undefined;

/**
 * Server-side Cloudflare Turnstile check for public forms.
 * Without TURNSTILE_SECRET_KEY the check is skipped in development and previews; in Vercel production the form is refused.
 */
export async function verifyTurnstile(token: unknown, ip: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Production without the secret refuses: a missing setting must show as an error, never as bot protection silently off (security jury tur 27).
    if (process.env.VERCEL_ENV === "production") { console.error("TURNSTILE_SECRET_KEY eksik: giriş ve kayıt reddediliyor."); return false; }
    return true;
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
