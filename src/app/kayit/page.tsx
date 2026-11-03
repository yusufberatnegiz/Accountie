import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/app/giris/LoginView";
import { AFTER_LOGIN, safeNextPath } from "@/lib/auth/next-path";
import { getUserId } from "@/lib/auth/session";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Hesap oluştur" };
export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ hata?: string; sonra?: string }> }) {
  const { hata, sonra } = await searchParams;
  // A shared panel link survives signing up, as it does signing in (same check: plain panel paths only).
  const next = safeNextPath(sonra) ?? undefined;
  if (await getUserId()) redirect(next ?? AFTER_LOGIN);
  return <LoginView hata={hata} isSignup turnstileSiteKey={turnstileSiteKey()} next={next} />;
}
