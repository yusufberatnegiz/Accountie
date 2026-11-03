"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const PREFILL_KEY = "kayit-eposta";

/** The product's "Hesap oluşturun" window, open on the page. The typed e-mail rides to /kayit in sessionStorage, never in the URL. */
export function SignupDialog() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  return (
    <form className="cta-dialog" data-ui aria-labelledby="cta-dialog-title"
      onSubmit={(e) => {
        e.preventDefault();
        try { if (email.trim()) sessionStorage.setItem(PREFILL_KEY, email.trim()); } catch { /* storage blocked: the field starts empty */ }
        router.push("/kayit");
      }}>
      <p className="cta-dialog-title" id="cta-dialog-title">Hesap oluşturun</p>
      <label>E-posta
        <input className="field" type="email" name="email" autoComplete="email" spellCheck={false}
          placeholder="muhasebe@buro.com.tr…" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-accent btn-lg">Hesap oluştur</button>
      <p className="cta-dialog-alt">Hesabınız var mı? <Link href="/giris">Giriş yapın</Link></p>
    </form>
  );
}
