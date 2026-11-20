/**
 * Shared Sentry settings for the browser, the Node server and the edge. No DSN (NEXT_PUBLIC_SENTRY_DSN unset): Sentry stays
 * off. Privacy: no session replay, no user feedback widget, no collected request data (no IP, cookies, headers or request bodies); receipts and
 * invoice data never leave as anything but an error's own message. A DSN is public by design (it only lets you send events).
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

export const sentryOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  // Nothing a request carries leaves: bodies hold clients' GİB logins (firm import) and receipt data; headers a session or the
  // extension key; local variables may hold either. @sentry/core 11 reads dataCollection, not sendDefaultPii.
  dataCollection: {
    userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, databaseQueryData: false,
    stackFrameVariables: false, genAI: { inputs: false, outputs: false }, mcp: { inputs: false, outputs: false }, queues: false,
  },
  // A second lock should an integration attach request data to an error event anyway: it never leaves with a body, cookies or
  // headers. (Traces stream as spans in @sentry/core 11, past beforeSendTransaction: for them the dataCollection above is the lock.)
  beforeSend<T extends { request?: { data?: unknown; cookies?: unknown; headers?: unknown; query_string?: unknown } }>(event: T): T {
    if (event.request) { delete event.request.data; delete event.request.cookies; delete event.request.headers; delete event.request.query_string; }
    return event;
  },
  beforeSendTransaction<T extends { request?: { data?: unknown; cookies?: unknown; headers?: unknown; query_string?: unknown } }>(event: T): T {
    if (event.request) { delete event.request.data; delete event.request.cookies; delete event.request.headers; delete event.request.query_string; }
    return event;
  },
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
