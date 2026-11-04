"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset, resetPassword, type ResetState } from "./actions";
import { ERRORS, useAfterAttempt } from "./AuthForm";
import { EmailField, PasswordField, TurnstileWidget } from "./AuthFields";
import { SubmitButton } from "./SubmitButton";

/** /giris/sifre: the e-mail step. After sending, the form gives way to a status that says what to do next. */
export function RequestResetForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [state, action] = useActionState<ResetState, FormData>(requestReset, undefined);
  const alertRef = useAfterAttempt(state);
  if (state?.sent) {
    return (
      <p className="alert alert-ok" role="status">
        Bu e-postayla bir hesap varsa yeni şifre bağlantısı gönderildi. Gelen kutunuza ve istenmeyen klasörüne bakın; bağlantıyı açıp yeni şifrenizi yazın.
      </p>
    );
  }
  const text = state?.error ? ERRORS[state.error] : undefined;
  return (
    <form action={action} className="auth-fields" noValidate>
      {text && !state?.field ? <p className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>{text}</p> : null}
      <EmailField error={state?.field === "email" ? text : undefined} defaultValue={state?.email} last />
      <TurnstileWidget siteKey={turnstileSiteKey} />
      <SubmitButton label="Bağlantı gönder" pendingLabel="Gönderiliyor…" />
    </form>
  );
}

/** /giris/sifre/yeni: the new password, with the token from the e-mailed link. */
export function NewPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<ResetState, FormData>(resetPassword, undefined);
  const alertRef = useAfterAttempt(state);
  const text = state?.error ? ERRORS[state.error] : undefined;
  return (
    <form action={action} className="auth-fields" noValidate>
      {text && !state?.field ? (
        <p className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>
          {text} <Link href="/giris/sifre">Yeni bağlantı isteyin</Link>
        </p>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <PasswordField label="Yeni şifre" name="password" autoComplete="new-password" hint="En az 8 karakter" error={state?.field === "password" ? text : undefined} />
      <SubmitButton label="Şifreyi kaydet" pendingLabel="Kaydediliyor…" />
    </form>
  );
}
