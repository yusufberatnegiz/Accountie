import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

// Page-level redirect only; every route handler still checks the session itself.
export default function proxy(request: NextRequest) {
  return getAuth().middleware({ loginUrl: "/giris" })(request);
}

export const config = {
  matcher: ["/((?!giris|api/|auth/callback|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg).*)"],
};
