import Link from "next/link";
import Script from "next/script";
import { login, signup } from "./actions";
import { SubmitButton } from "./SubmitButton";
import { Brand } from "@/components/BrandMark";
import { ThemeSwitch } from "@/components/ThemeSwitch";

const ERRORS: Record<string, string> = {
  bicim: "E-posta ve şifreyi kontrol edin.",
  kimlik: "E-posta veya şifre hatalı.",
  "cok-deneme": "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.",
  "kayit-bicim": "Bilgileri ve şifre tekrarını kontrol edin.",
  "kayit-cok": "Çok fazla hesap oluşturma denemesi. Bir saat sonra tekrar deneyin.",
  kayit: "Hesap oluşturulamadı. E-posta kullanımda olabilir.",
  bot: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.",
};
const MESSAGES: Record<string, string> = { "kayit-tamam": "Hesabınız oluşturuldu. Giriş yapabilirsiniz." };

/** Login and signup form; the page and the dev preview both render it. */
export function LoginView({ hata, mesaj, isSignup, turnstileSiteKey }: { hata?: string; mesaj?: string; isSignup: boolean; turnstileSiteKey?: string }) {
  const error = hata ? ERRORS[hata] : undefined;
  const message = mesaj ? MESSAGES[mesaj] : undefined;
  return (
    <main id="icerik" tabIndex={-1} className="auth">
      <div className="auth-top"><ThemeSwitch /></div>
      <section className="panel auth-card">
        <div>
          <Brand href="/" />
          <h1>{isSignup ? "Hesap oluşturun" : "Giriş yapın"}</h1>
          <p className="muted">Fiş fotoğrafından Luca yevmiye kaydı hazırlayın.</p>
        </div>
        {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
        {message ? <p className="alert" role="status">{message}</p> : null}
        <form action={isSignup ? signup : login}>
          {isSignup ? <label>Ad soyad<input className="field" name="name" autoComplete="name" minLength={2} maxLength={100} required /></label> : null}
          <label>E-posta<input className="field" name="email" type="email" autoComplete="email" spellCheck={false} required /></label>
          <label>Şifre<input className="field" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
          {isSignup ? <label>Şifre tekrar<input className="field" name="passwordAgain" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label> : null}
          {turnstileSiteKey ? (
            <>
              <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
              <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language="tr" />
            </>
          ) : null}
          <SubmitButton label={isSignup ? "Hesap oluştur" : "Giriş yap"} pendingLabel={isSignup ? "Hesap oluşturuluyor" : "Giriş yapılıyor"} />
        </form>
        <p className="muted">
          {isSignup ? "Hesabınız var mı? " : "Hesabınız yok mu? "}
          <Link href={isSignup ? "/giris" : "/giris?mod=kayit"}>{isSignup ? "Giriş yapın" : "Hesap oluşturun"}</Link>
        </p>
      </section>
    </main>
  );
}
