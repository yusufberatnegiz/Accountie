import type { Metadata } from "next";
import { login } from "./actions";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;
  return <main className="login-page">
    <section className="login-card">
      <div className="brand login-brand"><span className="brand-mark">A</span><span>Accountie</span></div>
      <p className="eyebrow">Ofis içi erişim</p><h1>Hesabınıza giriş yapın</h1><p>Yalnızca yönetici tarafından eklenen ofis hesapları giriş yapabilir.</p>
      {hata ? <div className="login-error" role="alert">{hata}</div> : null}
      <form action={login} className="login-form">
        <label>E-posta<input className="field" name="email" type="email" autoComplete="email" required /></label>
        <label>Şifre<input className="field" name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
        <button className="button primary" type="submit">Giriş yap</button>
      </form>
    </section>
  </main>;
}
