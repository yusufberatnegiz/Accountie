"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { GibConnection, type GibState } from "@/components/GibConnection";

export type EInvoiceResult = { created: number; skipped: { file: string; number: string | null; reason: string }[] };

/**
 * e-Fatura / e-Arşiv import: the müşavir downloads the firm's incoming invoices (XML, or the zip GİB and integrators give) and
 * uploads them here; each plain purchase invoice becomes a draft to check like a receipt. Accountie never signs in to GİB.
 */
export function EInvoiceView({ firmName, gib, months, base = "/panel", preview }: { firmName: string; gib: GibState; months: string[]; base?: string; preview?: EInvoiceResult }) {
  const router = useRouter();
  const [result, setResult] = useState<EInvoiceResult | null>(preview ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  // The result sits right under the GİB card, above the upload; focusing its heading brings it on screen on a phone too.
  const show = (r: EInvoiceResult) => { setResult({ created: r.created ?? 0, skipped: r.skipped ?? [] }); requestAnimationFrame(() => resultHeading.current?.focus()); };

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const firm = document.querySelector<HTMLElement>(".app")?.dataset.firm;
    if (firm) data.set("firma", firm);
    setBusy(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/efatura", { method: "POST", body: data }).catch(() => null);
    setBusy(false);
    const body = await res?.json().catch(() => null);
    if (!res?.ok) return setError(body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.");
    show(body);
    if (body.created) router.refresh();
  }

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-reconcile">
      <div className="title-row">
        <div className="title-text">
          <p className="crumb firm-crumb"><Link href={`${base}/firmalar`} aria-label={`Firma: ${firmName}. Firma değiştir`}>{firmName}</Link></p>
          <h1>e-Fatura ve e-Arşiv</h1>
          <p className="finding">Firmaya gelen faturaları {gib.enabled ? "GİB e-Arşiv portalından çekin ya da " : ""}XML/zip olarak yükleyin; her alış faturası kontrol edeceğiniz bir taslak olur.</p>
        </div>
      </div>

      {gib.enabled ? <GibConnection gib={gib} months={months} onResult={show} /> : null}

      {result ? (
        <section className="panel reconcile-result" aria-labelledby="fatura-sonuc">
          <h2 id="fatura-sonuc" ref={resultHeading} tabIndex={-1}>Sonuç</h2>
          <p className="reconcile-summary">
            <span data-state={result.created ? "tamam" : undefined}>{result.created} fatura taslak oldu</span>
            <span data-state={result.skipped.length ? "bekleyen" : undefined}>{result.skipped.length} atlandı</span>
          </p>
          {result.created ? <p><Link className="btn btn-primary" href={`${base}?durum=taslak`}>Taslakları kontrol et</Link></p> : null}
          {result.skipped.length ? (
            <div className="reconcile-group">
              <h3>Atlananlar</h3>
              <ul>{result.skipped.map((s, i) => <li key={i}><span className="tnum">{s.number ?? s.file}</span> · {s.reason}</li>)}</ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="panel reconcile-upload" aria-labelledby="fatura-yukle">
        <h2 id="fatura-yukle">{gib.enabled ? "Ya da dosya yükleyin" : "Dosya yükleyin"}</h2>
        <ol className="guide">
          <li>GİB e-Arşiv portalında ya da entegratörünüzde gelen faturaları seçin.</li>
          <li>XML olarak (birden çoksa zip) indirin ve buraya yükleyin.</li>
        </ol>
        <p className="muted small">Dosya saklanmaz; yalnız taslaklar kaydedilir. Faturanın bu firmaya kesildiği firmanın VKN&apos;siyle doğrulanır; satış, iade, tevkifatlı ve döviz faturaları atlanır.</p>
        <form className="reconcile-form" onSubmit={upload}>
          <label className="stack"><span>XML ya da zip (en fazla 4 MB, 300 fatura)</span><input className="field field-file" type="file" aria-invalid={error ? true : undefined} aria-describedby={error ? "fatura-hata" : undefined} name="dosya" accept=".xml,.zip,application/xml,text/xml,application/zip" required /></label>
          {error ? <p id="fatura-hata" className="alert alert-error" role="alert">{error}</p> : null}
          <button type="submit" className={gib.enabled ? "btn" : "btn btn-primary"} aria-busy={busy || undefined}>{busy ? <>Okunuyor <span className="wait-dots" aria-hidden="true"><i /><i /><i /></span></> : "Faturaları yükle"}</button>
        </form>
        <p className="visually-hidden" role="status">{busy ? "Faturalar okunuyor" : result ? `${result.created} fatura taslak oldu, ${result.skipped.length} atlandı.` : ""}</p>
      </section>
    </main>
  );
}
