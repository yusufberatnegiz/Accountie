import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { safeNextPath } from "@/lib/auth/next-path";

// Only the panel is matched: the homepage, auth pages, assets and unknown public addresses (which must 404, not bounce to /giris) stay outside.
// Page-level redirect only; every route handler still checks the session itself.
export default async function proxy(request: NextRequest) {
  const response = await getAuth().middleware({ loginUrl: "/giris" })(request);
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
