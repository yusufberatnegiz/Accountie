import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/giris" });

export const config = {
  matcher: ["/((?!giris|api/auth|api/cron|auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
