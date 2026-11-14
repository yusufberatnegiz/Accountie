import * as Sentry from "@sentry/nextjs";

// Sentry on the server and the edge (src/lib/sentry-options.ts); off while NEXT_PUBLIC_SENTRY_DSN is unset.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

// Errors thrown in Server Components, route handlers and the proxy.
export const onRequestError = Sentry.captureRequestError;
