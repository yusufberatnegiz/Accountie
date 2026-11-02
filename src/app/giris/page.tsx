import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth/session";
import { LoginView } from "./LoginView";

export const metadata: Metadata = { title: "Giriş" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hata?: string; mesaj?: string; mod?: string }> }) {
  if (await getUserId()) redirect("/");
  const { hata, mesaj, mod } = await searchParams;
  return (
    <LoginView hata={hata} mesaj={mesaj} isSignup={mod === "kayit"} />
  );
}
