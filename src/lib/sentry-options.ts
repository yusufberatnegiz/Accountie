/**
 * Shared Sentry settings for the browser, the Node server and the edge. No DSN (NEXT_PUBLIC_SENTRY_DSN unset): Sentry stays
 * off. Privacy: no session replay, no user feedback widget, no default PII (no IP, cookies or request bodies); receipts and
 * invoice data never leave as anything but an error's own message. A DSN is public by design (it only lets you send events).
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

export const sentryOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  sendDefaultPii: false,
  // A tenth of requests traced: enough to see slow routes without filling the free quota.
  tracesSampleRate: 0.1,
};

/** The origin events are sent to, for the CSP's connect-src (empty when Sentry is off). */
export function sentryOrigin(dsn = SENTRY_DSN): string {
  if (!dsn) return "";
  try {
    return new URL(dsn).origin;
  } catch {
    return "";
  }
}
