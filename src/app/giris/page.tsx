import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { login, register } from "./actions";

export const metadata: Metadata = { title: "Giriş" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hata?: string; mesaj?: string; mod?: string }> }) {
  const { data: session } = await auth.getSession();
  if (session?.user) redirect("/");
  const { hata, mesaj, mod } = await searchParams;
  const isSignup = mod === "kayit";
  return <main className="login-page">
    <section className="login-card">
      <div className="brand login-brand"><span className="brand-mark">A</span><span>Accountie</span></div>
      <p className="eyebrow">Ofis içi erişim</p><h1>{isSignup ? "Hesap oluşturun" : "Hesabınıza giriş yapın"}</h1><p>{isSignup ? "Adınız, e-posta adresiniz ve parolanızla Accountie hesabınızı açın." : "Ofis hesabınızla güvenli şekilde giriş yapın."}</p>
      {hata ? <div className="login-error" role="alert">{hata}</div> : null}
      {mesaj ? <div className="login-message" role="status">{mesaj}</div> : null}
      <form action={isSignup ? register : login} className="login-form">
        {isSignup ? <label>Ad soyad<input className="field" name="name" type="text" autoComplete="name" minLength={2} maxLength={100} required /></label> : null}
        <label>E-posta<input className="field" name="email" type="email" autoComplete="email" required /></label>
        <label>Şifre<input className="field" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
        {isSignup ? <label>Şifre tekrar<input className="field" name="passwordAgain" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label> : null}
        <button className="button primary" type="submit">{isSignup ? "Hesap oluştur" : "Giriş yap"}</button>
      </form>
      <div className="auth-switch"><span>{isSignup ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"}</span><Link href={isSignup ? "/giris" : "/giris?mod=kayit"}>{isSignup ? "Giriş yap" : "Hesap oluştur"}</Link></div>
    </section>
  </main>;
}
