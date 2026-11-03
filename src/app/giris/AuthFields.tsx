"use client";

import Script from "next/script";
import { useState, type ReactNode } from "react";

type Err = { error?: string };

/** The field's own error under it, tied by aria-describedby together with any rule hint. */
function described(id: string, hint?: string, error?: string) {
  return [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}
function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? <p className="field-error" id={`${id}-error`}>{error}</p> : null;
}

/** Cloudflare Turnstile, only when a site key is configured. */
export function TurnstileWidget({ siteKey }: { siteKey?: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language="tr" />
    </>
  );
}

/** Password with a show/hide toggle and its rule tied by aria-describedby. `aside` (the reset link) comes last in tab order and is drawn at the end of the label row. */
export function PasswordField({ label, name, autoComplete, hint, error, aside }: { label: string; name: string; autoComplete: string; hint?: string; aside?: ReactNode } & Err) {
  const id = "auth-password";
  const [shown, setShown] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input className="field" id={id} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete}
          minLength={8} maxLength={128} required spellCheck={false} aria-invalid={error ? true : undefined} aria-describedby={described(id, hint, error)} />
        <button type="button" className="auth-reveal" onClick={() => setShown((s) => !s)}
          aria-label={shown ? `${label} gizle` : `${label} göster`}>
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z" />
            <circle cx="8" cy="8" r="2" />
            {shown ? null : <path d="M2.5 13.5l11-11" />}
          </svg>
        </button>
      </div>
      {hint ? <p className="hint" id={`${id}-hint`}>{hint}</p> : null}
      <FieldError id={id} error={error} />
      {/* After the field and its toggle in tab order; drawn at the end of the label row. */}
      {aside ? <div className="auth-aside">{aside}</div> : null}
    </div>
  );
}

export function NameField({ error, defaultValue }: Err & { defaultValue?: string }) {
  const id = "auth-name";
  return (
    <div className="auth-field">
      <label htmlFor={id}>Ad soyad</label>
      <input className="field" id={id} name="name" autoComplete="name" autoCapitalize="words" minLength={2} maxLength={100} required
        defaultValue={defaultValue} aria-invalid={error ? true : undefined} aria-describedby={described(id, undefined, error)} />
      <FieldError id={id} error={error} />
    </div>
  );
}

/** E-mail field. */
export function EmailField({ error, defaultValue }: { defaultValue?: string } & Err) {
  const id = "auth-email";
  return (
    <div className="auth-field">
      <label htmlFor={id}>E-posta</label>
      <input className="field" id={id} name="email" type="email" autoComplete="email" spellCheck={false}
        maxLength={200} required defaultValue={defaultValue}
        aria-invalid={error ? true : undefined} aria-describedby={described(id, undefined, error)} />
      <FieldError id={id} error={error} />
    </div>
  );
}
