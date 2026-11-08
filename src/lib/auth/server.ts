import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase project URL and publishable key, read on the server only; throws when either is missing or malformed. */
export function authConfig(): { url: string; key: string } {
  // Server-only names (no NEXT_PUBLIC_): the browser never talks to Supabase, so nothing is inlined into a bundle.
  const read = (name: string) => process.env[`SUPABASE_${name}`];
  const url = read("URL");
  const key = read("PUBLISHABLE_KEY");
  // A malformed value counts as missing: fail closed (503) rather than send sessions to a wrong address.
  if (!url || !/^https?:\/\/[^/\s]+$/.test(url) || !key || key.length < 20) {
    throw new Error("SUPABASE_URL veya SUPABASE_PUBLISHABLE_KEY ortam değişkeni eksik ya da geçersiz.");
  }
  return { url, key };
}

/**
 * The session cookies: HttpOnly (the browser never needs the tokens), Secure in production, SameSite=Lax (the cross-site
 * guard of every POST route), 400 days as the library sets them. @supabase/ssr's own default is not HttpOnly.
 */
export const AUTH_COOKIE_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/**
 * Supabase Auth for this request, server side only (the browser never talks to Supabase, so the CSP stays 'self').
 * The session lives in httpOnly cookies; in a Server Component they cannot be written, and the proxy refreshes them instead.
 */
export async function getAuth() {
  const { url, key } = authConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Component render: read-only cookies; the proxy has already refreshed the session.
        }
      },
    },
  }).auth;
}
