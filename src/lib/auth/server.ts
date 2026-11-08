import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase project URL and publishable key. Both are public by design (RLS guards the data); throws when either is missing. */
export function authConfig(): { url: string; key: string } {
  // Read at run time, not inlined at build (a literal process.env.NEXT_PUBLIC_* would be): server code only, and a missing value
  // in production fails closed instead of being baked into the bundle.
  const read = (name: string) => process.env[`NEXT_PUBLIC_SUPABASE_${name}`]; // a computed name: the bundler cannot inline it
  const url = read("URL");
  const key = read("PUBLISHABLE_KEY");
  // A malformed value counts as missing: fail closed (503) rather than send sessions to a wrong address.
  if (!url || !/^https?:\/\/[^/\s]+$/.test(url) || !key || key.length < 20) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ortam değişkeni eksik ya da geçersiz.");
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
