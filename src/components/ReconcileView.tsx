"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MonthPicker } from "@/components/MonthPicker";
import type { Reconciliation } from "@/lib/luca/muavin";
import { monthLabel } from "@/lib/month";
import { formatTrAmount } from "@/lib/money";

type Result = Reconciliation & { rowCount: number };

/**
 * Muavin check: the month's receipts Accountie sent to Luca against the muavin Excel downloaded from Luca. What matches is
 * counted; what does not is listed for the müşavir to look at in Luca. The file stays in this request only.
 */
export function ReconcileView({ firmName, month, months, base = "/panel", preview }: { firmName: string; month: string; months: string[]; base?: string; preview?: Result }) {
  const [result, setResult] = useState<Result | null>(preview ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function check(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    data.set("ay", month);
    const firm = document.querySelector<HTMLElement>(".app")?.dataset.firm;
    if (firm) data.set("firma", firm);
    setBusy(true);
    setError("");
    const res = await fetch("/api/reconcile", { method: "POST", body: data }).catch(() => null);
    setBusy(false);
    const body = await res?.json().catch(() => null);
    if (!res?.ok) return setError(body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.");
    setResult(body);
  }

  const by = (kind: string) => result?.results.filter((r) => r.kind === kind) ?? [];
  const ok = by("uyuyor"), off = by("fark"), missing = by("yok");

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-reconcile">
      <div className="title-row">
        <div className="title-text">
          <p className="crumb firm-crumb"><Link href={`${base}/firmalar`} aria-label={`Firma: ${firmName}. Firma değiştir`}>{firmName}</Link></p>
          <h1>Muavin karşılaştırması</h1>
          <p className="finding">{monthLabel(month)} içinde Luca&apos;ya aktardığınız fişler, Luca&apos;dan indirdiğiniz muavinle satır satır karşılaştırılır.</p>
        </div>
        <div className="title-actions"><MonthPicker months={months} value={month} path={`${base}/mutabakat`} allLabel={null} /></div>
      </div>

      <section className="panel reconcile-upload" aria-labelledby="muavin-yukle">
        <h2 id="muavin-yukle">Muavin dosyası</h2>
        <p className="muted">Luca&apos;da bu firmanın {monthLabel(month)} muavinini (191, 770 ya da hepsi) Excel olarak indirin ve buraya yükleyin. Dosya saklanmaz.</p>
        <form className="reconcile-form" onSubmit={check} aria-describedby={error ? "muavin-hata" : undefined}>
          <label className="stack"><span>Excel dosyası (.xlsx)</span><input className="field" type="file" name="dosya" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
          {error ? <p id="muavin-hata" className="alert alert-error" role="alert">{error}</p> : null}
          <button type="submit" className="btn btn-primary" aria-disabled={busy || undefined}>{busy ? "Karşılaştırılıyor…" : "Karşılaştır"}</button>
        </form>
      </section>

      {result ? (
        <section className="panel reconcile-result" aria-labelledby="sonuc" aria-live="polite">
          <h2 id="sonuc">Sonuç</h2>
          <p className="reconcile-summary">
            <span data-state="tamam">{ok.length} fiş uyuyor</span>
            <span data-state={off.length ? "bekleyen" : undefined}>{off.length} tutar farkı</span>
            <span data-state={missing.length ? "bekleyen" : undefined}>{missing.length} fiş Luca&apos;da yok</span>
            <span data-state={result.extra.length ? "bekleyen" : undefined}>{result.extra.length} kayıt Accountie&apos;de yok</span>
          </p>
          <p className="muted small">Muavinde {result.rowCount} satır{result.accounts.length ? `, hesaplar: ${result.accounts.join(", ")}` : ", hesap kodu yok (tutarlar evrak no ile karşılaştırıldı)"}. Yalnız muavindeki hesaplar karşılaştırılır.</p>
          {result.results.length === 0 && result.extra.length === 0 ? <p>Bu ay Luca&apos;ya aktarılmış fiş yok ve muavinde karşılaştırılacak kayıt bulunmadı.</p> : null}

          {off.length ? (
            <div className="reconcile-group">
              <h3>Tutar farkı</h3>
              <ul>{off.map((r) => r.kind === "fark" && (
                <li key={r.receipt.id}>
                  <Link href={`${base}/fis/${r.receipt.id}`}><span className="tnum">{r.receipt.documentNo}</span> {r.receipt.vendorName ?? "Satıcı okunamadı"}</Link>
                  <ul>{r.lines.map((l) => <li key={l.accountCode} className="tnum">{l.accountCode}: Accountie {formatTrAmount(l.expectedKurus)}, Luca {l.foundKurus === null ? "satır yok" : formatTrAmount(l.foundKurus)}</li>)}</ul>
                </li>
              ))}</ul>
            </div>
          ) : null}
          {missing.length ? (
            <div className="reconcile-group">
              <h3>Luca&apos;da bulunamadı</h3>
              <p className="muted small">Aktarıldı görünüyor ama muavinde bu evrak no yok: yükleme yarıda kalmış ya da başka evrak no ile girilmiş olabilir.</p>
              <ul>{missing.map((r) => <li key={r.receipt.id}><Link href={`${base}/fis/${r.receipt.id}`}><span className="tnum">{r.receipt.documentNo}</span> {r.receipt.vendorName ?? "Satıcı okunamadı"}</Link></li>)}</ul>
            </div>
          ) : null}
          {result.extra.length ? (
            <div className="reconcile-group">
              <h3>Accountie&apos;de yok</h3>
              <p className="muted small">Muavinde var, bu ay Accountie&apos;den aktarılmadı: elle ya da başka yoldan girilmiş olabilir.</p>
              <ul>{result.extra.map((r, i) => <li key={i} className="tnum">{r.documentNo} · {r.accountCode ?? "hesap kodu yok"} · {formatTrAmount(r.debitKurus || r.creditKurus)}{r.date ? ` · ${r.date.split("-").reverse().join(".")}` : ""}</li>)}</ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
