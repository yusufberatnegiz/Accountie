import type { ReactNode } from "react";
import { AuthForm } from "./AuthForm";
import { CookieNote } from "@/components/site/CookieNote";
import { SiteBar } from "@/components/site/SiteBar";
import { BrandMark } from "@/components/BrandMark";
import "./auth.css";

const MESSAGES: Record<string, string> = {
  "kayit-tamam": "Hesabınız oluşturuldu. E-postanıza gelen bağlantıyla adresinizi doğrulayın, sonra burada giriş yapın.",
  "sifre-yeni": "Şifreniz değişti. Yeni şifrenizle giriş yapın.",
  "hesap-silindi": "Hesabınız ve verileriniz silindi. Kanunen saklanması gereken ödeme kayıtları bunun dışındadır.",
  baglanti: "Bu bağlantı geçersiz ya da süresi dolmuş. Giriş yapın ya da yeniden kayıt bağlantısı isteyin.",
};

/**
 * Shared frame of the auth screens: the public bar and one centred column (the mark, the title, the form), as Linear, Vercel
 * and Paraşüt do it. Nothing beside the form: the person came here to sign in, the homepage already shows the product.
 */
export function AuthShell({ title, lead, current, children }: { title: string; lead: string; current?: "giris" | "kayit"; children: ReactNode }) {
  return (
    <div className="auth">
      <SiteBar current={current} />
      <main id="icerik" tabIndex={-1} className="auth-main">
        <section className="auth-form" aria-labelledby="auth-title">
          <div className="auth-head">
            <span className="auth-mark" aria-hidden="true"><BrandMark /></span>
            <h1 id="auth-title">{title}</h1>
            <p>{lead}</p>
          </div>
          {children}
        </section>
      </main>
      {/* After the content: the strip is fixed, so this only puts it last in reading and Tab order (WCAG 2.4.3). */}
      <CookieNote />
    </div>
  );
}

/**
 * Login (/giris) and signup (/kayit) as two separate screens (docs/design/YON.md 5.4); the pages and the dev previews render it.
 * `next` is an already validated panel path (?sonra=) that login or signup returns to; the switch link carries it along.
 */
export function LoginView({ hata, mesaj, isSignup, turnstileSiteKey, next }: { hata?: string; mesaj?: string; isSignup: boolean; turnstileSiteKey?: string; next?: string }) {
  const message = mesaj ? MESSAGES[mesaj] : undefined;
  return (
    <AuthShell
      current={isSignup ? "kayit" : "giris"}
      title={isSignup ? "Hesap oluşturun" : "Giriş yapın"}
      lead={isSignup ? "Fiş fotoğraflarından Luca yevmiye kaydı hazırlayın." : "Fiş listenize ve hesap kurallarınıza dönün."}>
      {message ? <p className="alert alert-ok" role="status">{message}</p> : null}
      <AuthForm isSignup={isSignup} initialError={hata} turnstileSiteKey={turnstileSiteKey} next={next} />
      <p className="auth-switch">
        {isSignup ? "Hesabınız var mı? " : "Hesabınız yok mu? "}
        <a href={`${isSignup ? "/giris" : "/kayit"}${next ? `?sonra=${encodeURIComponent(next)}` : ""}`}>{isSignup ? "Giriş yapın" : "Hesap oluşturun"}</a>
      </p>
    </AuthShell>
  );
}
