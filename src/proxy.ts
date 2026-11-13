import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { nonceCsp } from "@/lib/csp";
import { AUTH_COOKIE_OPTIONS, authConfig } from "@/lib/auth/server";
import { AFTER_LOGIN } from "@/lib/auth/next-path";
import { safeNextPath } from "@/lib/auth/next-path";

// Missing auth config (or the auth client failing): fail closed with our own response, so it still gets the CSP here
// and next.config's security headers, which a thrown error (a bare 500) skips.
function unavailable(api: boolean, error: unknown) {
  console.error("proxy: kimlik ayarı kullanılamıyor", error);
  const headers = { "retry-after": "60", "cache-control": "no-store" };
  return api
    ? NextResponse.json({ error: "Hizmet geçici olarak kullanılamıyor. Bir dakika sonra yeniden deneyin." }, { status: 503, headers })
    : new NextResponse("Hizmet geçici olarak kullanılamıyor. Bir dakika sonra yeniden deneyin.", { status: 503, headers: { ...headers, "content-type": "text/plain; charset=utf-8" } });
}

// Matched: the panel (session check + nonce CSP), the dynamic auth pages (nonce CSP only) and the API (auth config check only;
// each route handler still checks the session itself and gets the public CSP from next.config). The homepage, assets and unknown
// public addresses (which must 404, not bounce to /giris) stay outside.
export default async function proxy(incoming: NextRequest) {
  if (incoming.nextUrl.pathname.startsWith("/api/")) {
    // A change requested by another site's page is refused here, on top of the SameSite=Lax session cookie. The extension
    // sends a Bearer token and no cookie, so it is not a cross-site request in that sense.
    const origin = incoming.headers.get("origin");
    const extension = incoming.nextUrl.pathname.startsWith("/api/extension/") && incoming.headers.get("authorization")?.startsWith("Bearer ");
    // iyzico's payment page posts the result token here; the route trusts nothing in it and asks iyzico itself.
    const paymentCallback = incoming.nextUrl.pathname === "/api/payments/callback";
    if (!["GET", "HEAD", "OPTIONS"].includes(incoming.method) && origin && !extension && !paymentCallback) {
      let same = false;
      try { same = new URL(origin).host === incoming.headers.get("host"); } catch { /* malformed Origin */ }
      if (!same) return NextResponse.json({ error: "Bu istek başka bir siteden geldiği için reddedildi." }, { status: 403 });
    }
    try { authConfig(); } catch (error) { return unavailable(true, error); }
    return NextResponse.next();
  }
  // Next reads the nonce from the request's CSP header and puts it on its own scripts; the auth middleware forwards request headers.
  const csp = nonceCsp(btoa(crypto.randomUUID()));
  const headers = new Headers(incoming.headers);
  headers.set("content-security-policy", csp);
  const request = new NextRequest(incoming, { headers });
  if (!/^\/panel(\/|$)/.test(request.nextUrl.pathname)) {
    try { authConfig(); } catch (error) {
      const closed = unavailable(false, error);
      closed.headers.set("content-security-policy", csp);
      return closed;
    }
    const open = NextResponse.next({ request: { headers } });
    open.headers.set("content-security-policy", csp);
    return open;
  }
  let response: NextResponse;
  try {
    response = await panelSession(request, headers);
  } catch (error) {
    response = unavailable(false, error);
  }
  response.headers.set("content-security-policy", csp);
  return response;
}

/**
 * The panel needs a verified Supabase session. getUser() checks the token with Supabase and refreshes it; the refreshed
 * cookies go on both the request (for the page about to render) and the response. Without a user: /giris, keeping a panel
 * deep link (a shared fiş, the extension, the PWA shortcut) as /giris?sonra=/panel/fis/...
 */
async function panelSession(request: NextRequest, headers: Headers): Promise<NextResponse> {
  const { url, key } = authConfig();
  let response = NextResponse.next({ request: { headers } });
  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        headers.set("cookie", request.headers.get("cookie") ?? ""); // the page renders with the refreshed session
        response = NextResponse.next({ request: { headers } });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (data?.user) return response;
  const to = new URL("/giris", request.url);
  const ay = request.nextUrl.searchParams.get("ay"), paket = request.nextUrl.searchParams.get("paket");
  const query = ay ? `?ay=${ay}` : paket ? `?paket=${paket}` : "";
  const back = safeNextPath(request.nextUrl.pathname + query) ?? safeNextPath(request.nextUrl.pathname);
  if (back && back !== AFTER_LOGIN) to.searchParams.set("sonra", back);
  return NextResponse.redirect(to);
}

export const config = {
  matcher: ["/panel", "/panel/:path*", "/giris", "/giris/:path*", "/kayit", "/kayit/:path*", "/api/:path*"],
};
