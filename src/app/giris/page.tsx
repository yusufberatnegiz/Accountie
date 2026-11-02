import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth/session";
import { login, signup } from "./actions";

export const metadata: Metadata = { title: "Giriş" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hata?: string; mesaj?: string; mod?: string }> }) {
  if (await getUserId()) redirect("/");
  const { hata, mesaj, mod } = await searchParams;
  const isSignup = mod === "kayit";
  return (
    <main className="auth">
      <section className="panel auth-card">
        <div>
          <p className="brand">Accountie</p>
          <h1>{isSignup ? "Hesap oluşturun" : "Giriş yapın"}</h1>
          <p className="muted">Fiş fotoğrafından Luca yevmiye kaydı hazırlayın.</p>
        </div>
        {hata ? <p className="alert alert-error" role="alert">{hata}</p> : null}
        {mesaj ? <p className="alert" role="status">{mesaj}</p> : null}
        <form action={isSignup ? signup : login}>
          {isSignup ? <label>Ad soyad<input className="field" name="name" autoComplete="name" minLength={2} maxLength={100} required /></label> : null}
          <label>E-posta<input className="field" name="email" type="email" autoComplete="email" required /></label>
          <label>Şifre<input className="field" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
          {isSignup ? <label>Şifre tekrar<input className="field" name="passwordAgain" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label> : null}
          <button className="btn btn-primary" type="submit">{isSignup ? "Hesap oluştur" : "Giriş yap"}</button>
        </form>
        <p className="muted">
          {isSignup ? "Hesabınız var mı? " : "Hesabınız yok mu? "}
          <Link href={isSignup ? "/giris" : "/giris?mod=kayit"}>{isSignup ? "Giriş yapın" : "Hesap oluşturun"}</Link>
        </p>
      </section>
    </main>
  );
}
