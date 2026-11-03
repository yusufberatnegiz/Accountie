import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "./AuthForm";
import { Brand } from "@/components/BrandMark";
import { ThemeCycle, ThemeSwitch } from "@/components/ThemeSwitch";
import ledger from "../../../public/gorseller/yevmiye-defteri-1833.jpg";
import "./auth.css";

const MESSAGES: Record<string, string> = {
  "kayit-tamam": "Hesabınız oluşturuldu. E-postanıza gelen bağlantıyla adresinizi doğrulayın, sonra burada giriş yapın.",
};

/**
 * Login (/giris) and signup (/kayit) as two separate screens (docs/design/YON.md 5.4); the pages and the dev previews render it.
 * Form left on the same left edge as the wordmark, the 1833 ledger page full-bleed right; phones get the form alone.
 */
export function LoginView({ hata, mesaj, isSignup, turnstileSiteKey }: { hata?: string; mesaj?: string; isSignup: boolean; turnstileSiteKey?: string }) {
  const message = mesaj ? MESSAGES[mesaj] : undefined;
  return (
    <main id="icerik" tabIndex={-1} className="auth">
      <div className="auth-side">
        <div className="auth-top">
          <Brand href="/" />
          <span className="auth-theme"><ThemeSwitch /></span>
          <span className="auth-theme-narrow"><ThemeCycle /></span>
        </div>
        <section className="auth-form" aria-labelledby="auth-title">
          <div className="auth-head">
            <h1 id="auth-title">{isSignup ? "Hesap oluşturun" : "Giriş yapın"}</h1>
            <p>{isSignup ? "Fiş fotoğrafından Luca yevmiye kaydı hazırlayın. Varsayılan hesap planı kural tablonuza kopyalanır." : "Fiş listenize ve hesap kurallarınıza dönün."}</p>
          </div>
          {message ? <p className="alert alert-ok" role="status">{message}</p> : null}
          <AuthForm isSignup={isSignup} initialError={hata} turnstileSiteKey={turnstileSiteKey} />
          <p className="auth-switch">
            {isSignup ? "Hesabınız var mı? " : "Hesabınız yok mu? "}
            <Link href={isSignup ? "/giris" : "/kayit"}>{isSignup ? "Giriş yapın" : "Hesap oluşturun"}</Link>
          </p>
        </section>
      </div>
      <figure className="auth-stage">
        <div className="auth-photo"><Image src={ledger} alt="Elle tutulmuş 1833 tarihli bir tüccar hesap defterinden bir sayfa, mürekkeple yazılmış tutar sütunları" fill sizes="50vw" placeholder="blur" priority /></div>
        <figcaption>Elle tutulmuş bir tüccar hesap defteri sayfası, 1833.</figcaption>
      </figure>
    </main>
  );
}
