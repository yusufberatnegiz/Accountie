import { NextRequest } from "next/server";
import { panelCsp } from "@/lib/csp";
import { getAuth } from "@/lib/auth/server";
import { safeNextPath } from "@/lib/auth/next-path";

// Only the panel is matched: the homepage, auth pages, assets and unknown public addresses (which must 404, not bounce to /giris) stay outside.
// Page-level redirect only; every route handler still checks the session itself.
export default async function proxy(incoming: NextRequest) {
  // Next reads the nonce from the request's CSP header and puts it on its own scripts; the auth middleware forwards request headers.
  const csp = panelCsp(btoa(crypto.randomUUID()));
  const headers = new Headers(incoming.headers);
  headers.set("content-security-policy", csp);
  const request = new NextRequest(incoming, { headers });
  const response = await getAuth().middleware({ loginUrl: "/giris" })(request);
  response?.headers.set("content-security-policy", csp);
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
  matcher: ["/panel", "/panel/:path*"],
};
