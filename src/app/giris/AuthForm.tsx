"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef } from "react";
import { login, signup, type AuthState } from "./actions";
import { EmailField, NameField, PasswordField } from "./AuthFields";
import { SubmitButton } from "./SubmitButton";

// Fixed texts for the codes the actions (or an old ?hata= link) hand back; each says what to do next.
const ERRORS: Record<string, string> = {
  "bicim-ad": "Ad soyad en az 2 karakter olmalı.",
  "bicim-eposta": "Geçerli bir e-posta adresi yazın, örneğin ornek@buro.com.tr.",
  "bicim-sifre": "Şifre en az 8 karakter olmalı.",
  bicim: "E-posta ve şifreyi kontrol edin.",
  "kayit-bicim": "Ad soyad, e-posta ve şifreyi kontrol edin.",
  kimlik: "E-posta veya şifre hatalı. Şifreyi göster düğmesiyle yazdığınızı kontrol edin.",
  "cok-deneme": "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.",
  "kayit-cok": "Çok fazla hesap oluşturma denemesi. Bir saat sonra tekrar deneyin.",
  kayit: "Hesap oluşturulamadı. Bu e-postayla bir hesap olabilir; giriş yapmayı deneyin.",
  bot: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.",
};

declare global { interface Window { turnstile?: { reset: () => void } } }

/**
 * Login or signup form. A failed attempt comes back as state: the message sits under its field (aria-invalid, aria-describedby),
 * focus moves there, and the typed e-mail and name stay. Errors without a field go in the alert above the form.
 */
export function AuthForm({ isSignup, initialError, turnstileSiteKey }: { isSignup: boolean; initialError?: string; turnstileSiteKey?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(isSignup ? signup : login, initialError && ERRORS[initialError] ? { error: initialError } : undefined);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const text = state ? ERRORS[state.error] : undefined;
  const at = (f: "name" | "email" | "password") => (state?.field === f ? text : undefined);

  useEffect(() => {
    if (!state) return;
    if (state.field) document.getElementById(`auth-${state.field}`)?.focus();
    else alertRef.current?.focus();
    window.turnstile?.reset(); // a token works once; the next try needs a fresh one
  }, [state]);

  return (
    <form action={action} className="auth-fields">
      {text && !state?.field ? <p className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>{text}</p> : null}
      {isSignup ? <NameField error={at("name")} defaultValue={state?.name} /> : null}
      <EmailField prefill={isSignup} error={at("email")} defaultValue={state?.email} />
      <PasswordField label="Şifre" name="password" autoComplete={isSignup ? "new-password" : "current-password"} hint={isSignup ? "En az 8 karakter" : undefined} error={at("password")} />
      {turnstileSiteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language="tr" />
        </>
      ) : null}
      <SubmitButton label={isSignup ? "Hesap oluştur" : "Giriş yap"} pendingLabel={isSignup ? "Hesap oluşturuluyor…" : "Giriş yapılıyor…"} />
    </form>
  );
}
