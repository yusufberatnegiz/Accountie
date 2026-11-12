"use client";

import { useActionState, useEffect, useRef } from "react";
import { deleteMyAccount, type DeleteState } from "@/app/giris/actions";

const ERRORS: Record<NonNullable<DeleteState>["error"], string> = {
  "bos-sifre": "Şifrenizi yazın.",
  kimlik: "Şifre hatalı. Hesap silinmedi.",
  "cok-deneme": "Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.",
  sunucu: "Hesap silinemedi, hiçbir veri silinmedi. Biraz sonra tekrar deneyin.",
};

/** The password again, then one irreversible step: the button says exactly what it does, and confirm() asks once more. */
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteMyAccount, undefined);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state) field.current?.focus(); }, [state]);
  const error = state ? ERRORS[state.error] : undefined;
  return (
    <form action={action} className="stack delete-form"
      onSubmit={(e) => { if (!confirm("Hesabınız ve verileriniz, kalan kontörünüz dahil, kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) e.preventDefault(); }}>
      <label className="stack" htmlFor="sil-sifre">
        <span>Onaylamak için şifreniz</span>
        <input ref={field} className="field" id="sil-sifre" name="password" type="password" autoComplete="current-password" maxLength={128} required
          aria-invalid={error ? true : undefined} aria-describedby={error ? "sil-hata" : undefined} />
      </label>
      {error ? <p id="sil-hata" className="alert alert-error" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn-danger" aria-disabled={pending || undefined} onClick={(e) => { if (pending) e.preventDefault(); }}>
        {pending ? "Siliniyor…" : "Hesabımı ve verilerimi kalıcı olarak sil"}
      </button>
    </form>
  );
}

/** The page body of /panel/hesap (also shown by the dev preview). */
export function DeleteAccountView() {
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-account">
      <div className="title-row">
        <div className="title-text">
          <h1>Hesabı sil</h1>
          <p className="finding">Hesabınız ve Accountie&apos;deki bütün verileriniz, kalan kontörünüz dahil, hemen ve kalıcı olarak silinir. Geri alınamaz. Kanunen saklanması gereken ödeme kayıtları bunun dışındadır.</p>
        </div>
      </div>
      <section className="delete-section" aria-labelledby="silinecekler">
        <h2 id="silinecekler">Silinecekler</h2>
        <ul className="delete-list">
          <li>Bütün firmalarınız, hesap planları ve firma kuralları</li>
          <li>Bütün fişler, Z raporları, faturalar ve yevmiye satırları</li>
          <li>Hesap kurallarınız ve satıcıya göre öğrenilen kurallar</li>
          <li>Eklenti anahtarları: eklenti hemen çalışmaz olur</li>
          <li>Giriş bilgileriniz (ad, e-posta, şifre)</li>
        </ul>
        <p className="muted">Luca&apos;ya aktardığınız kayıtlar Luca&apos;da kalır. Onaylı ama aktarmadığınız fişler varsa önce Fişler sayfasından Excel ile aktarım bölümündeki <strong>Excel indir</strong> ile dosyasını alın.</p>
        <DeleteAccountForm />
      </section>
    </main>
  );
}
