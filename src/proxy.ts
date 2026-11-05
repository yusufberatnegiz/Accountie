import { NextRequest, NextResponse } from "next/server";
import { nonceCsp } from "@/lib/csp";
import { getAuth } from "@/lib/auth/server";
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
    try { getAuth(); } catch (error) { return unavailable(true, error); }
    return NextResponse.next();
  }
  // Next reads the nonce from the request's CSP header and puts it on its own scripts; the auth middleware forwards request headers.
  const csp = nonceCsp(btoa(crypto.randomUUID()));
  const headers = new Headers(incoming.headers);
  headers.set("content-security-policy", csp);
  const request = new NextRequest(incoming, { headers });
  if (!/^\/panel(\/|$)/.test(request.nextUrl.pathname)) {
    try { getAuth(); } catch (error) {
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
    response = await getAuth().middleware({ loginUrl: "/giris" })(request);
  } catch (error) {
    response = unavailable(false, error);
  }
  response.headers.set("content-security-policy", csp);
  // A panel deep link (a shared fiş, the extension, the PWA shortcut) survives the login: /giris?sonra=/panel/fis/...
  const location = response?.headers.get("location");
  const back = safeNextPath(request.nextUrl.pathname);
  if (location && back && back !== "/panel") {
    const to = new URL(location, request.url);
    if (to.origin === request.nextUrl.origin && to.pathname === "/giris") {
      to.searchParams.set("sonra", back);
      response.headers.set("location", to.toString());
    }
  }
  return response;
}

export const config = {
  matcher: ["/panel", "/panel/:path*", "/giris", "/giris/:path*", "/kayit", "/kayit/:path*", "/api/:path*"],
};
