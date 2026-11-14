import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

// Browser errors (src/lib/sentry-options.ts): no session replay, no feedback widget, no default PII.
// shortcut: loaded after hydration, so an error in the first moment of a page load is not reported; import it statically if that matters.
const sentry = SENTRY_DSN && sentryOptions.enabled
  ? import("@sentry/nextjs").then((S) => { S.init(sentryOptions); return S; })
  : null;

export function onRouterTransitionStart(href: string, navigationType: string) {
  sentry?.then((S) => S.captureRouterTransitionStart(href, navigationType));
}
