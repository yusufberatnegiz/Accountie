import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AuthForm } from "./AuthForm";
import { CookieNote } from "@/components/site/CookieNote";
import { SiteBar } from "@/components/site/SiteBar";
import { Thermal } from "@/components/home/Thermal";
import { defaultPayment, journalFor, SAMPLES, shownAccountName } from "@/components/home/samples";
import { formatTrAmount } from "@/lib/money";
import "./auth.css";

const MESSAGES: Record<string, string> = {
  "kayit-tamam": "Hesabınız oluşturuldu. E-postanıza gelen bağlantıyla adresinizi doğrulayın, sonra burada giriş yapın.",
  "sifre-yeni": "Şifreniz değişti. Yeni şifrenizle giriş yapın.",
};

const SAMPLE = SAMPLES[0];
const { lines } = journalFor(SAMPLE, defaultPayment(SAMPLE));
const total = lines.reduce((s, l) => s + l.debitKurus, 0);

/** The product's own face beside the form: the thermal strip and the three Luca lines made from it (no photo, no user data). */
function Stage() {
  return (
    <aside className="auth-stage" aria-label="Örnek: bir fiş ve Luca satırları">
      <div className="auth-piece" data-ui>
        <div className="auth-strip"><Thermal sample={SAMPLE} printedPayment="KREDİ KARTI" /></div>
        <div className="auth-sheet">
          <p className="auth-sheet-head"><span>Luca Fiş Detayı</span><span className="auth-sheet-meta">Evrak No {SAMPLE.receipt.receiptNo}, BT ÖK</span></p>
          <table>
            <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.accountCode} style={{ "--i": i } as CSSProperties}>
                  <td><span className="auth-code" translate="no">{l.accountCode}</span><span className="auth-code-name">{shownAccountName(l.accountName)}</span></td>
                  <td className="num to-luca">{l.debitKurus ? formatTrAmount(l.debitKurus) : ""}</td>
                  <td className="num to-luca">{l.creditKurus ? formatTrAmount(l.creditKurus) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="auth-balance">Borç <span className="to-luca">{formatTrAmount(total)}</span> = Alacak <span className="to-luca">{formatTrAmount(total)}</span></p>
        </div>
      </div>
      <p className="auth-stage-note">Fişten okunan rakam gri, Luca’ya giden rakam mavi.</p>
    </aside>
  );
}

/** Shared frame of the auth screens: the public bar, the form column in <main>, the product piece on the stage tone. */
export function AuthShell({ title, lead, current, children }: { title: string; lead: string; current?: "giris" | "kayit"; children: ReactNode }) {
  return (
    <div className="auth">
      <SiteBar current={current} />
      <main id="icerik" tabIndex={-1} className="auth-main">
        <section className="auth-form" aria-labelledby="auth-title">
          <div className="auth-head">
            <h1 id="auth-title">{title}</h1>
            <p>{lead}</p>
          </div>
          {children}
        </section>
      </main>
      <Stage />
      <CookieNote />
    </div>
  );
}

/**
 * Login (/giris) and signup (/kayit) as two separate screens (docs/design/YON.md 5.4); the pages and the dev previews render it.
 * `next` is an already validated panel path (?sonra=) the login returns to.
 */
export function LoginView({ hata, mesaj, isSignup, turnstileSiteKey, next }: { hata?: string; mesaj?: string; isSignup: boolean; turnstileSiteKey?: string; next?: string }) {
  const message = mesaj ? MESSAGES[mesaj] : undefined;
  return (
    <AuthShell
      current={isSignup ? "kayit" : "giris"}
      title={isSignup ? "Hesap oluşturun" : "Giriş yapın"}
      lead={isSignup ? "Fiş fotoğrafından Luca yevmiye kaydı hazırlayın. Varsayılan hesap planı kural tablonuza kopyalanır." : "Fiş listenize ve hesap kurallarınıza dönün."}>
      {message ? <p className="alert alert-ok" role="status">{message}</p> : null}
      <AuthForm isSignup={isSignup} initialError={hata} turnstileSiteKey={turnstileSiteKey} next={next} />
      <p className="auth-switch">
        {isSignup ? "Hesabınız var mı? " : "Hesabınız yok mu? "}
        <Link href={isSignup ? "/giris" : "/kayit"}>{isSignup ? "Giriş yapın" : "Hesap oluşturun"}</Link>
      </p>
    </AuthShell>
  );
}
