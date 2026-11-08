import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { AFTER_LOGIN, safeNextPath } from "@/lib/auth/next-path";

/**
 * Where Supabase's e-mailed links land: sign-up confirmation and password reset (?tur=sifre). The one-time ?code= becomes a
 * session in httpOnly cookies (PKCE: the verifier cookie was set by the action that sent the e-mail, in this browser).
 * Redirects only to fixed paths or a same-site panel path, never to anything from the link itself.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const reset = url.searchParams.get("tur") === "sifre";
  const ok = !!code && code.length <= 512 && !(await (await getAuth()).exchangeCodeForSession(code)).error;
  if (!ok) return NextResponse.redirect(new URL(reset ? "/giris/sifre/yeni?hata=1" : "/giris?mesaj=baglanti", url));
  return NextResponse.redirect(new URL(reset ? "/giris/sifre/yeni" : (safeNextPath(url.searchParams.get("sonra")) ?? AFTER_LOGIN), url));
}
