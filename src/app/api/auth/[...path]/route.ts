import { getAuth } from "@/lib/auth/server";
import { fail } from "@/lib/http";
import { allow, clientIp } from "@/lib/rate-limit";

type Handler = ReturnType<ReturnType<typeof getAuth>["handler"]>;

// Neon Auth sees only our server's IP, so its own per-IP limits cannot tell users apart; credential endpoints are limited here.
// Sign-in/up go through the /giris server actions (Turnstile + per-e-mail limit); the raw endpoints would bypass both.
// No boundaries on purpose: over-matching only blocks or limits, under-matching is a bypass.
const CLOSED = /sign-?(in|up)/;
// verification: each call sends an e-mail, so unlimited calls would flood unverified addresses.
const LIMITED = /sign-?(in|up)|forget-password|password-reset|reset-password|change-password|send-verification|verify-email/;

/**
 * The path as the upstream will see it. Next decodes the catch-all params and the proxy re-joins them into a URL that the
 * upstream may decode again, so match on the params (not request.url), fully decoded and lower-cased.
 */
function authPath(segments: readonly string[]): string {
  let p = "/" + segments.join("/");
  for (let i = 0; i < 5; i++) {
    let next: string;
    try { next = decodeURIComponent(p); } catch { break; }
    if (next === p) break;
    p = next;
  }
  return p.replaceAll("\\", "/").toLowerCase();
}

export const GET: Handler["GET"] = (...args) => getAuth().handler().GET(...args);
export const POST: Handler["POST"] = async (...args) => {
  const [request, ctx] = args;
  const path = authPath((await ctx.params).path);
  if (CLOSED.test(path)) return fail("Bulunamadı.", 404);
  if (LIMITED.test(path) && !(await allow("loginIp", clientIp(request.headers)))) {
    return fail("Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.", 429);
  }
  return getAuth().handler().POST(...args);
};
