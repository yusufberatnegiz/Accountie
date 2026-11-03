import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/app/giris/LoginView";
import { getUserId } from "@/lib/auth/session";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Hesap oluştur" };
export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  if (await getUserId()) redirect("/panel");
  const { hata } = await searchParams;
  return <LoginView hata={hata} isSignup turnstileSiteKey={turnstileSiteKey()} />;
}
