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
 * Supabase Auth for this request, server side only (the browser never talks to Supabase, so the CSP stays 'self').
 * The session lives in httpOnly cookies; in a Server Component they cannot be written, and the proxy refreshes them instead.
 */
export async function getAuth() {
  const { url, key } = authConfig();
  const store = await cookies();
  return createServerClient(url, key, {
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
