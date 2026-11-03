"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PREFILL_KEY } from "@/components/home/SignupDialog";

/** Password with a show/hide toggle and its rule tied by aria-describedby. */
export function PasswordField({ label, name, autoComplete, hint }: { label: string; name: string; autoComplete: string; hint?: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input className="field" id={id} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete}
          minLength={8} maxLength={128} required spellCheck={false} aria-describedby={hint ? `${id}-hint` : undefined} />
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
    </div>
  );
}

/** E-mail field; on the signup page it takes the address typed into the homepage window (sessionStorage, never the URL). */
export function EmailField({ prefill }: { prefill?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!prefill || !ref.current) return;
    try {
      const v = sessionStorage.getItem(PREFILL_KEY);
      if (v && !ref.current.value) ref.current.value = v;
      sessionStorage.removeItem(PREFILL_KEY);
    } catch { /* storage blocked */ }
  }, [prefill]);
  return (
    <div className="auth-field">
      <label htmlFor="auth-email">E-posta</label>
      <input ref={ref} className="field" id="auth-email" name="email" type="email" autoComplete="email" spellCheck={false}
        placeholder="muhasebe@buro.com.tr…" maxLength={200} required />
    </div>
  );
}
