import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { login, signup } from "./actions";
import { EmailField, NameField, PasswordField } from "./AuthFields";
import { SubmitButton } from "./SubmitButton";
import { Brand } from "@/components/BrandMark";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import ledger from "../../../public/gorseller/yevmiye-defteri-1833.jpg";
import "./auth.css";

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

/**
 * Login (/giris) and signup (/kayit) as two separate screens (docs/design/YON.md 5.4); the pages and the dev previews render it.
 * Form left, the 1833 ledger page full-bleed right (same archival picture and square crop as the homepage); phones get the form alone.
 */
export function LoginView({ hata, mesaj, isSignup, turnstileSiteKey }: { hata?: string; mesaj?: string; isSignup: boolean; turnstileSiteKey?: string }) {
  const error = hata ? ERRORS[hata] : undefined;
  const message = mesaj ? MESSAGES[mesaj] : undefined;
  return (
    <main id="icerik" tabIndex={-1} className="auth">
      <div className="auth-side">
        <div className="auth-top">
          <Brand href="/" />
          <span className="auth-theme"><ThemeSwitch /></span>
        </div>
        <section className="auth-form" aria-labelledby="auth-title">
          <div className="auth-head">
            <h1 id="auth-title">{isSignup ? "Hesap oluşturun" : "Giriş yapın"}</h1>
            <p className="muted">Fiş fotoğrafından Luca yevmiye kaydı hazırlayın.</p>
          </div>
          {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
          {message ? <p className="alert alert-ok" role="status">{message}</p> : null}
          <form action={isSignup ? signup : login} className="auth-fields">
            {isSignup ? <NameField /> : null}
            <EmailField prefill={isSignup} />
            <PasswordField label="Şifre" name="password" autoComplete={isSignup ? "new-password" : "current-password"} hint={isSignup ? "En az 8 karakter" : undefined} />
            {isSignup ? <PasswordField label="Şifre tekrar" name="passwordAgain" autoComplete="new-password" /> : null}
            {turnstileSiteKey ? (
              <>
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language="tr" />
              </>
            ) : null}
            <SubmitButton label={isSignup ? "Hesap oluştur" : "Giriş yap"} pendingLabel={isSignup ? "Hesap oluşturuluyor…" : "Giriş yapılıyor…"} />
          </form>
          <p className="auth-switch">
            {isSignup ? "Hesabınız var mı? " : "Hesabınız yok mu? "}
            <Link href={isSignup ? "/giris" : "/kayit"}>{isSignup ? "Giriş yapın" : "Hesap oluşturun"}</Link>
          </p>
        </section>
      </div>
      <figure className="auth-stage">
        <div className="auth-photo"><Image src={ledger} alt="Elle tutulmuş 1833 tarihli bir tüccar hesap defterinden bir sayfa, mürekkeple yazılmış tutar sütunları" fill sizes="50vw" priority /></div>
        <figcaption>Bir tüccarın hesap defterinden bir sayfa, 1833.</figcaption>
      </figure>
    </main>
  );
}
