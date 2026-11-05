import { NextRequest, NextResponse } from "next/server";
import { nonceCsp } from "@/lib/csp";
import { getAuth } from "@/lib/auth/server";
import { safeNextPath } from "@/lib/auth/next-path";

// Matched: the panel (session check + nonce CSP) and the dynamic auth pages (nonce CSP only). The homepage, assets and unknown
// public addresses (which must 404, not bounce to /giris) stay outside. Page-level redirect only; every route handler still checks the session itself.
export default async function proxy(incoming: NextRequest) {
  // Next reads the nonce from the request's CSP header and puts it on its own scripts; the auth middleware forwards request headers.
  const csp = nonceCsp(btoa(crypto.randomUUID()));
  const headers = new Headers(incoming.headers);
  headers.set("content-security-policy", csp);
  const request = new NextRequest(incoming, { headers });
  if (!/^\/panel(\/|$)/.test(request.nextUrl.pathname)) {
    const open = NextResponse.next({ request: { headers } });
    open.headers.set("content-security-policy", csp);
    return open;
  }
  let response: NextResponse;
  try {
    response = await getAuth().middleware({ loginUrl: "/giris" })(request);
  } catch (error) {
    // Missing auth config (or the auth client failing): fail closed with our own response, so it still gets the CSP here
    // and next.config's security headers, which a thrown proxy error (a bare 500) skips.
    console.error("proxy: oturum denetimi yapılamadı", error);
    response = new NextResponse("Hizmet geçici olarak kullanılamıyor.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "60", "cache-control": "no-store" } });
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
  matcher: ["/panel", "/panel/:path*", "/giris", "/giris/:path*", "/kayit", "/kayit/:path*"],
};
