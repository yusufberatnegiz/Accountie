import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

// "/" (the public homepage), /giris, /kayit and /gorseller are outside the matcher: `.+` never matches the bare root.
// Page-level redirect only; every route handler still checks the session itself.
// /onizleme exists only in `next dev` (page.dev.tsx, see next.config.ts), so excluding it is a no-op in production.
export default function proxy(request: NextRequest) {
  return getAuth().middleware({ loginUrl: "/giris" })(request);
}

export const config = {
  matcher: ["/((?!giris|kayit|gorseller/|api/|auth/callback|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-touch-icon|onizleme).+)"],
};
