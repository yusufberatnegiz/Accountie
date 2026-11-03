import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { safeNextPath } from "@/lib/auth/next-path";

// "/" (the public homepage), /giris, /kayit, /gizlilik, /gorseller, robots.txt and the offline pair (sw.js, cevrimdisi.html) are outside the matcher: `.+` never matches the bare root.
// Page-level redirect only; every route handler still checks the session itself.
// /onizleme exists only in `next dev` (page.dev.tsx, see next.config.ts), so excluding it is a no-op in production.
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
  matcher: ["/((?!(?:giris|kayit|gizlilik|onizleme|auth/callback)(?:/|$)|gorseller/|api/|_next/static|_next/image|favicon\\.ico$|manifest\\.webmanifest$|robots\\.txt$|sw\\.js$|cevrimdisi\\.html$|icon[\\w-]*\\.(?:svg|png)$|apple-touch-icon\\.png$).+)"],
};
