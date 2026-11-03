"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const PREFILL_KEY = "kayit-eposta";
export const PREFILL_NAME_KEY = "kayit-ad";

/**
 * The first half of the real /kayit form, open on the page: same fields, same primary button.
 * Name and e-mail ride to /kayit in sessionStorage (never the URL); the passwords are typed there, never carried.
 */
export function SignupDialog() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form className="cta-dialog" data-ui aria-labelledby="cta-dialog-title"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (name.trim()) sessionStorage.setItem(PREFILL_NAME_KEY, name.trim());
          if (email.trim()) sessionStorage.setItem(PREFILL_KEY, email.trim());
        } catch { /* storage blocked: the field starts empty */ }
        router.push("/kayit");
      }}>
      <p className="cta-dialog-title" id="cta-dialog-title">Hesap oluşturun</p>
      <label>Ad soyad
        <input className="field" name="name" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>E-posta
        <input className="field" type="email" name="email" autoComplete="email" spellCheck={false}
          placeholder="ornek@buro.com.tr" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-accent btn-lg">Hesap oluştur</button>
      <p className="cta-dialog-alt">Hesabınız var mı? <Link href="/giris">Giriş yapın</Link></p>
    </form>
  );
}
