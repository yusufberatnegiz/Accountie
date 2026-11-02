"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { ReceiptDetail } from "@/db/queries";
import { PAYMENT_ALTERNATIVES } from "@/lib/default-rules";
import { isBalanced, type JournalLine } from "@/lib/journal";
import { clipboardText } from "@/lib/luca/clipboard";
import { formatTrAmount, parseTrAmount } from "@/lib/money";
import { getPhoto } from "@/lib/photo-store";
import { ExportButton } from "./ExportButton";

type EditLine = Omit<JournalLine, "debitKurus" | "creditKurus"> & { key: number; debit: string; credit: string };

const noSubscribe = () => () => {};
let nextKey = 0;
const toEdit = (l: JournalLine): EditLine => {
  const { debitKurus, creditKurus, ...rest } = l;
  return { ...rest, key: nextKey++, debit: debitKurus ? formatTrAmount(debitKurus) : "", credit: creditKurus ? formatTrAmount(creditKurus) : "" };
};

/** "" -> 0, invalid -> NaN. */
function kurus(text: string): number {
  if (!text.trim()) return 0;
  try {
    return parseTrAmount(text);
  } catch {
    return NaN;
  }
}

const toLine = ({ key, debit, credit, ...rest }: EditLine): JournalLine => ({ ...rest, debitKurus: kurus(debit), creditKurus: kurus(credit) });

export function ReviewEditor({ receipt }: { receipt: ReceiptDetail }) {
  const router = useRouter();
  const editable = receipt.status === "draft";
  const [lines, setLines] = useState(() => receipt.lines.map(toEdit));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  // Photo exists only in this tab; server render has none.
  const photo = useSyncExternalStore(noSubscribe, () => getPhoto(receipt.id), () => undefined);

  const parsed = lines.map(toLine);
  const invalid = parsed.some((l) => Number.isNaN(l.debitKurus) || Number.isNaN(l.creditKurus));
  const sum = (f: (l: JournalLine) => number) => parsed.reduce((s, l) => s + (Number.isNaN(f(l)) ? 0 : f(l)), 0);
  const debit = sum((l) => l.debitKurus);
  const credit = sum((l) => l.creditKurus);
  const vat = sum((l) => (l.accountCode.startsWith("191") ? l.debitKurus : 0));
  const balanced = !invalid && isBalanced(parsed);
  const creditCode = parsed.find((l) => l.creditKurus > 0)?.accountCode ?? "";

  const update = (key: number, patch: Partial<EditLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const setCreditAccount = (code: string) => {
    const account = PAYMENT_ALTERNATIVES.find((a) => a.code === code);
    if (account) setLines((ls) => ls.map((l) => (kurus(l.credit) > 0 ? { ...l, accountCode: account.code, accountName: account.name } : l)));
  };
  const addLine = () => setLines((ls) => [...ls, { ...ls[0], key: nextKey++, accountCode: "", accountName: "", debit: "", credit: "" }]);

  async function call(url: string, init?: RequestInit): Promise<boolean> {
    const res = await fetch(url, init).catch(() => null);
    if (res?.ok) return true;
    const body = res ? await res.json().catch(() => null) : null;
    setError(body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.");
    return false;
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setInfo("");
    await action();
    setBusy(false);
  }

  const save = () => {
    if (invalid) {
      setError("Tutarları 7.931,82 biçiminde yazın.");
      return Promise.resolve(false);
    }
    return call(`/api/receipts/${receipt.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: parsed }) });
  };

  return (
    <div className="review">
      <section className="review-photo panel" aria-label="Fiş fotoğrafı">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from this device, next/image cannot optimize it */}
        {photo ? <img src={photo} alt="Fiş fotoğrafı" /> : <p className="photo-missing">Fotoğraf yalnızca çekildiği cihazda, aynı oturumda görünür.</p>}
      </section>

      <div style={{ display: "grid", gap: "var(--s4)" }}>
        {receipt.warnings.length ? (
          <div className="alert alert-warn">
            <ul className="notes">{receipt.warnings.map((w) => <li key={w.code}>{w.message}</li>)}</ul>
          </div>
        ) : null}

        {editable ? (
          <label style={{ maxWidth: 320 }}>
            Alacak hesabı
            <select className="field" value={PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? creditCode : ""} onChange={(e) => setCreditAccount(e.target.value)}>
              {PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? null : <option value="">{creditCode || "Seçin"}</option>}
              {PAYMENT_ALTERNATIVES.map((a) => <option key={a.code} value={a.code}>{a.code} {a.label}</option>)}
            </select>
          </label>
        ) : null}

        <section className="panel">
          <div className="table-wrap">
            <table className="lines">
              <thead>
                <tr>
                  <th className="col-code">Hesap Kodu</th><th>Hesap Adı</th><th className="col-small">Evrak No</th><th>Evrak Tarihi</th>
                  <th className="col-small">BT</th><th>Açıklama</th><th className="col-amount num">Borç (TL)</th><th className="col-amount num">Alacak (TL)</th>
                  {editable ? <th><span className="visually-hidden">Sil</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.key}>
                    <td data-label="Hesap Kodu"><input className="field mono" aria-label={`Satır ${i + 1} hesap kodu`} value={l.accountCode} disabled={!editable} inputMode="decimal" onChange={(e) => update(l.key, { accountCode: e.target.value })} /></td>
                    <td data-label="Hesap Adı"><input className="field" aria-label={`Satır ${i + 1} hesap adı`} value={l.accountName} disabled={!editable} onChange={(e) => update(l.key, { accountName: e.target.value })} /></td>
                    <td data-label="Evrak No"><input className="field mono" aria-label={`Satır ${i + 1} evrak no`} value={l.documentNo} disabled={!editable} onChange={(e) => update(l.key, { documentNo: e.target.value })} /></td>
                    <td data-label="Evrak Tarihi"><input className="field" type="date" aria-label={`Satır ${i + 1} evrak tarihi`} value={l.documentDate ?? ""} disabled={!editable} onChange={(e) => update(l.key, { documentDate: e.target.value || null })} /></td>
                    <td data-label="BT"><input className="field" aria-label={`Satır ${i + 1} belge türü`} value={l.documentType} disabled={!editable} onChange={(e) => update(l.key, { documentType: e.target.value })} /></td>
                    <td data-label="Açıklama" className="span2"><input className="field" aria-label={`Satır ${i + 1} açıklama`} value={l.description} disabled={!editable} onChange={(e) => update(l.key, { description: e.target.value })} /></td>
                    <td data-label="Borç (TL)"><input className="field num" aria-label={`Satır ${i + 1} borç`} value={l.debit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.debit))} onChange={(e) => update(l.key, { debit: e.target.value })} /></td>
                    <td data-label="Alacak (TL)"><input className="field num" aria-label={`Satır ${i + 1} alacak`} value={l.credit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.credit))} onChange={(e) => update(l.key, { credit: e.target.value })} /></td>
                    {editable ? <td><button className="btn btn-danger" type="button" aria-label={`Satır ${i + 1} sil`} disabled={lines.length <= 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>Sil</button></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals" aria-live="polite">
            <div><span>Borç toplamı</span><strong className="num">{formatTrAmount(debit)}</strong></div>
            <div><span>Alacak toplamı</span><strong className="num">{formatTrAmount(credit)}</strong></div>
            <div><span>191 toplamı</span><strong className="num">{formatTrAmount(vat)}</strong></div>
            {debit !== credit ? <div className="diff"><span>Fark</span><strong className="num">{formatTrAmount(Math.abs(debit - credit))}</strong></div> : null}
          </div>
        </section>

        {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
        {info ? <p role="status" className="muted">{info}</p> : null}

        <div className="actions">
          {editable ? (
            <>
              <button className="btn btn-primary" type="button" disabled={busy || !balanced} title={balanced ? undefined : "Borç ve alacak eşit olmalı"}
                onClick={() => run(async () => { if ((await save()) && (await call(`/api/receipts/${receipt.id}/approve`, { method: "POST" }))) router.refresh(); })}>
                Onayla
              </button>
              <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { if (await save()) { setInfo("Kaydedildi."); router.refresh(); } })}>Kaydet</button>
              <button className="btn" type="button" disabled={busy} onClick={addLine}>Satır ekle</button>
              <button className="btn btn-danger" type="button" disabled={busy}
                onClick={() => confirm("Bu taslak fiş silinsin mi?") && run(async () => { if (await call(`/api/receipts/${receipt.id}`, { method: "DELETE" })) router.push("/"); })}>
                Fişi sil
              </button>
            </>
          ) : (
            <>
              <ExportButton receiptIds={[receipt.id]} label="Bu fişi Luca için indir" />
              {receipt.status === "approved" ? (
                <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { if (await call(`/api/receipts/${receipt.id}/reopen`, { method: "POST" })) router.refresh(); })}>
                  Taslağa al
                </button>
              ) : null}
            </>
          )}
          <button className="btn" type="button" disabled={invalid}
            onClick={() => navigator.clipboard.writeText(clipboardText(parsed)).then(() => setInfo("Satırlar panoya kopyalandı."), () => setError("Panoya kopyalanamadı."))}>
            Kopyala
          </button>
        </div>
        {editable && !balanced ? <p className="muted">Onay için borç ve alacak toplamı eşit olmalı ve her satırda hesap kodu bulunmalı.</p> : null}
      </div>
    </div>
  );
}
