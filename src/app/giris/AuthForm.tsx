"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { login, signup } from "./actions";
import { checkAuthForm, fieldCode, type AuthField, type AuthState } from "./validation";
import { EmailField, NameField, PasswordField, TurnstileWidget } from "./AuthFields";
import { SubmitButton } from "./SubmitButton";

// Fixed texts for the codes the actions (or an old ?hata= link) hand back; each says what to do next.
export const ERRORS: Record<string, string> = {
  "bicim-ad": "Ad soyad en az 2 karakter olmalı.",
  "bicim-eposta": "Geçerli bir e-posta adresi yazın, örneğin ornek@buro.com.tr.",
  "bicim-sifre": "Şifre en az 8 karakter olmalı.",
  "bos-sifre": "Şifrenizi yazın.",
  bicim: "E-posta ve şifreyi kontrol edin.",
  "kayit-bicim": "Ad soyad, e-posta ve şifreyi kontrol edin.",
  kimlik: "E-posta veya şifre hatalı. Şifreyi göster düğmesiyle yazdığınızı kontrol edin ya da Şifremi unuttum bağlantısıyla yeni şifre alın.",
  "cok-deneme": "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.",
  "kayit-cok": "Çok fazla hesap oluşturma denemesi. Bir saat sonra tekrar deneyin.",
  kayit: "Hesap oluşturulamadı. Bu e-postayla bir hesap olabilir; giriş yapmayı deneyin.",
  bot: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.",
  sunucu: "İstek tamamlanamadı. Biraz sonra tekrar deneyin.",
  "sifre-cok": "Çok fazla şifre yenileme isteği. Bir saat sonra tekrar deneyin.",
  "sifre-baglanti": "Bu bağlantı geçersiz ya da süresi dolmuş. Yeni bir şifre bağlantısı isteyin.",
};

// An old ?hata= link that names a field marks that field, as a failed attempt does.
const FIELD_OF: Record<string, AuthField> = { "bicim-ad": "name", "bicim-eposta": "email", "bicim-sifre": "password", "bos-sifre": "password" };
export const initialState = (code?: string): AuthState =>
  // kimlik marks the password field, as the login action does.
  code && ERRORS[code] ? { error: code, field: FIELD_OF[code] ?? (code === "kimlik" ? "password" : undefined) } : undefined;

declare global { interface Window { turnstile?: { reset: () => void } } }

/** Moves focus to the failed field or the alert after an attempt, and resets Turnstile (a token works once). */
export function useAfterAttempt(state: { error?: string; field?: string } | undefined) {
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!state?.error) return;
    if (state.field) document.getElementById(`auth-${state.field}`)?.focus();
    else alertRef.current?.focus();
    window.turnstile?.reset();
  }, [state]);
  return alertRef;
}

/**
 * Login or signup form. A failed attempt comes back as state: the message sits under its field (aria-invalid, aria-describedby),
 * focus moves there, and the typed e-mail and name stay. Errors without a field go in the alert above the form.
 */
export function AuthForm({ isSignup, initialError, turnstileSiteKey, next }: { isSignup: boolean; initialError?: string; turnstileSiteKey?: string; next?: string }) {
  const [served, action] = useActionState<AuthState, FormData>(isSignup ? signup : login, initialState(initialError));
  // Format errors are caught here before the round trip (same schema as the server, which checks again).
  const [checked, setChecked] = useState<{ result: AuthState; after: AuthState } | null>(null);
  const state = checked && checked.after === served ? checked.result : served;
  const alertRef = useAfterAttempt(state);
  // Fields corrected since this attempt: their error goes as soon as the same check passes (an error is never added while typing).
  const [fixed, setFixed] = useState<{ of: AuthState; fields: AuthField[] }>({ of: undefined, fields: [] });
  const fixedNow = fixed.of === state ? fixed.fields : [];
  const values = (form: HTMLFormElement) => {
    const f = new FormData(form);
    return { name: isSignup ? f.get("name") : undefined, email: f.get("email"), password: f.get("password") };
  };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const result = checkAuthForm(isSignup, values(e.currentTarget));
    if (result) e.preventDefault();
    setChecked(result ? { result, after: served } : null);
  };
  const text = state ? ERRORS[state.error] : undefined;
  // Every invalid field shows its own message; focus still goes to the first one.
  const fieldError = (f: AuthField) => (state?.fields?.includes(f) ? ERRORS[fieldCode(f, isSignup)] : state?.field === f ? text : undefined);
  const at = (f: AuthField) => (fixedNow.includes(f) ? undefined : fieldError(f));
  const onEdit = (e: FormEvent<HTMLFormElement>) => {
    const f = (e.target as HTMLInputElement).name as AuthField;
    if (!fieldError(f) || fixedNow.includes(f)) return;
    if (!checkAuthForm(isSignup, values(e.currentTarget))?.fields?.includes(f)) setFixed({ of: state, fields: [...fixedNow, f] });
  };

  return (
    <form action={action} onSubmit={onSubmit} onInput={onEdit} onBlur={onEdit} className="auth-fields" noValidate>
      {text && !state?.field ? <p className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>{text}</p> : null}
      {next ? <input type="hidden" name="sonra" value={next} /> : null}
      {isSignup ? <NameField error={at("name")} defaultValue={state?.name} /> : null}
      <EmailField error={at("email")} defaultValue={state?.email} />
      <PasswordField label="Şifre" name="password" autoComplete={isSignup ? "new-password" : "current-password"} hint={isSignup ? "En az 8 karakter" : undefined} error={at("password")}
        aside={isSignup ? undefined : <Link href="/giris/sifre">Şifremi unuttum</Link>} />
      <TurnstileWidget siteKey={turnstileSiteKey} />
      <SubmitButton label={isSignup ? "Hesap oluştur" : "Giriş yap"} pendingLabel={isSignup ? "Hesap oluşturuluyor…" : "Giriş yapılıyor…"} />
      {isSignup ? (
        <p className="auth-consent">Hesap oluşturmadan önce <Link href="/gizlilik">gizlilik sayfasını</Link> okuyun: fiş fotoğrafı okunmak için Anthropic’e (ABD) gönderilir; Accountie fotoğrafı sunucuda ve veritabanında saklamaz.</p>
      ) : null}
    </form>
  );
}
