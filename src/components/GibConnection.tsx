"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { EInvoiceResult } from "@/components/EInvoiceView";
import { monthLabel } from "@/lib/month";

export type GibState = { enabled: boolean; connected: boolean; lastUsed: string | null };

const firmId = () => document.querySelector<HTMLElement>(".app")?.dataset.firm;

/**
 * The firm's GİB e-Arşiv portal connection: saved once (GİB checks it first, a wrong one is never kept), then the month's
 * invoices issued to the firm are pulled in one click. The password never comes back to the browser.
 */
export function GibConnection({ gib, months, onResult }: { gib: GibState; months: string[]; onResult: (r: EInvoiceResult) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "kaydet" | "cek" | "kaldir">("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function send(kind: "kaydet" | "cek" | "kaldir", init: RequestInit & { url: string }) {
    if (busy) return null;
    setBusy(kind);
    setError("");
    setNote("");
    const res = await fetch(init.url, init).catch(() => null);
    setBusy("");
    const body = res && res.status !== 204 ? await res.json().catch(() => null) : null;
    if (!res?.ok) { setError(body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin."); router.refresh(); return null; }
    return body ?? {};
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const ok = await send("kaydet", { url: "/api/gib/credentials", method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ firma: firmId(), kullaniciKodu: data.get("kullaniciKodu"), sifre: data.get("sifre") }) });
    form.reset(); // the password leaves the page whatever GİB said
    if (ok) { setNote("GİB bağlantıyı kabul etti; şifre şifrelenerek saklandı."); router.refresh(); }
  }

  async function pull(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ay = new FormData(e.currentTarget).get("ay");
    const body = await send("cek", { url: "/api/gib/earsiv", method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firma: firmId(), ay }) });
    if (!body) return;
    onResult(body);
    if (body.remaining) setNote(`${body.remaining} fatura süre yetmediği için çekilmedi; tekrar çekin, alınanlar atlanır.`);
    router.refresh();
  }

  async function remove() {
    if (await send("kaldir", { url: `/api/gib/credentials?firma=${encodeURIComponent(firmId() ?? "")}`, method: "DELETE" })) {
      setNote("Bağlantı ve kayıtlı şifre silindi.");
      router.refresh();
    }
  }

  return (
    <section className="panel reconcile-upload" aria-labelledby="gib-baglanti">
      <h2 id="gib-baglanti">GİB e-Arşiv bağlantısı</h2>
      {!gib.enabled ? <p className="muted">Bu sunucuda e-Arşiv bağlantısı kapalı. Faturaları dosya olarak yükleyebilirsiniz.</p> : gib.connected ? (
        <>
          <p className="muted small">Bu firma bağlı{gib.lastUsed ? `; son çekiş ${gib.lastUsed}` : ""}. Şifre şifreli saklanıyor ve hiçbir ekranda gösterilmiyor.</p>
          <form className="reconcile-form gib-pull" onSubmit={pull}>
            <label className="stack"><span>Ay</span>
              <select className="field" name="ay" defaultValue={months[0]}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
            </label>
            <div className="actions">
              <button type="submit" className="btn btn-primary" aria-disabled={busy !== "" || undefined}>{busy === "cek" ? "GİB'den çekiliyor…" : "Adıma düzenlenen faturaları çek"}</button>
              <button type="button" className="btn" onClick={remove} aria-disabled={busy !== "" || undefined}>{busy === "kaldir" ? "Kaldırılıyor…" : "Bağlantıyı kaldır"}</button>
            </div>
          </form>
        </>
      ) : (
        <>
          <p className="muted small">Firmanın e-Arşiv portalı kullanıcı kodu ve şifresi. GİB önce doğrular; yanlışsa saklanmaz. Doğruysa şifrelenerek saklanır ve bir daha gösterilmez. GİB yanlış denemelerde hesabı kilitleyebilir, bu yüzden deneme sayısı sınırlıdır. Tarayıcının bu şifreyi kaydetmesine izin vermeyin.</p>
          <form className="reconcile-form" onSubmit={save} autoComplete="off">
            <label className="stack"><span>Kullanıcı kodu</span><input className="field" name="kullaniciKodu" inputMode="numeric" autoComplete="off" spellCheck={false} required pattern="[0-9A-Za-z]{4,20}" maxLength={20} /></label>
            <label className="stack"><span>Şifre</span><input className="field" name="sifre" type="password" autoComplete="off" data-1p-ignore="" data-lpignore="true" data-bwignore="" required maxLength={64} /></label>
            <button type="submit" className="btn btn-primary" aria-disabled={busy !== "" || undefined}>{busy === "kaydet" ? "GİB ile doğrulanıyor…" : "Kaydet ve doğrula"}</button>
          </form>
        </>
      )}
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      <p className="muted small" role="status">{busy === "cek" ? "Faturalar GİB'den çekiliyor" : note}</p>
    </section>
  );
}
