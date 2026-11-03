import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth/session";
import { turnstileSiteKey } from "@/lib/turnstile";
import { LoginView } from "./LoginView";

export const metadata: Metadata = { title: "Giriş" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hata?: string; mesaj?: string; mod?: string }> }) {
  const { hata, mesaj, mod } = await searchParams;
  // Old signup links (/giris?mod=kayit) still land on the signup screen.
  if (mod === "kayit") redirect(hata ? `/kayit?${new URLSearchParams({ hata })}` : "/kayit");
  if (await getUserId()) redirect("/panel");
  return <LoginView hata={hata} mesaj={mesaj} isSignup={false} turnstileSiteKey={turnstileSiteKey()} />;
}
