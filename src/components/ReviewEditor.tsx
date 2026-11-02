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
type SharedField = "documentNo" | "documentDate" | "documentType" | "description";

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

// Warning codes that mean "the reader was unsure about this field".
const AMOUNT_WARNINGS = ["amount_unreadable", "total_mismatch", "vat_mismatch", "vat_computed", "vat_missing", "rounding_adjusted", "extraction_failed"];

export function ReviewEditor({ receipt }: { receipt: ReceiptDetail }) {
  const router = useRouter();
  const editable = receipt.status === "draft";
  const [lines, setLines] = useState(() => receipt.lines.map(toEdit));
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
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
  const head = lines[0];

  const codes = receipt.warnings.map((w) => w.code);
  const amountsUnsure = codes.some((c) => AMOUNT_WARNINGS.includes(c));
  // A flag stays until the user touches that field.
  const flag = (name: string, unsure: boolean) =>
    editable && unsure && !seen.has(name) ? { "data-check": "", "aria-describedby": "uyarilar" } : {};
  const touch = (name: string) => !seen.has(name) && setSeen((s) => new Set(s).add(name));

  const update = (key: number, patch: Partial<EditLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const updateAll = (field: SharedField, value: string | null) => {
    touch(field);
    setLines((ls) => ls.map((l) => ({ ...l, [field]: value })));
  };
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

  const copy = () => navigator.clipboard.writeText(clipboardText(parsed)).then(() => setInfo("Satırlar panoya kopyalandı."), () => setError("Panoya kopyalanamadı."));

  return (
    <div className="review">
      <section className="review-photo panel" aria-label="Fiş fotoğrafı">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from this device, next/image cannot optimize it */}
        {photo ? <img src={photo} alt="Fiş fotoğrafı" /> : <p className="photo-missing">Fotoğraf yalnızca çekildiği cihazda, aynı oturumda görünür.</p>}
      </section>

      <div className="review-main">
        {receipt.warnings.length ? (
          <div className="alert alert-warn" id="uyarilar">
            <p className="alert-title">Kontrol edilecekler</p>
            <ul className="notes">{receipt.warnings.map((w) => <li key={w.code}>{w.message}</li>)}</ul>
          </div>
        ) : null}

        <section className="panel panel-pad" aria-labelledby="bilgi-baslik">
          <h2 id="bilgi-baslik">Fiş bilgileri</h2>
          <p className="muted small">Bu alanlar bütün satırlara yazılır.</p>
          <div className="form-grid">
            <label>Evrak No
              <input className="field" value={head?.documentNo ?? ""} disabled={!editable} maxLength={40}
                {...flag("documentNo", codes.includes("extraction_failed") || !head?.documentNo)}
                onChange={(e) => updateAll("documentNo", e.target.value)} />
            </label>
            <label>Evrak Tarihi
              <input className="field" type="date" value={head?.documentDate ?? ""} disabled={!editable}
                {...flag("documentDate", codes.includes("date_invalid") || !head?.documentDate)}
                onChange={(e) => updateAll("documentDate", e.target.value || null)} />
            </label>
            <label>Belge türü (BT)
              <input className="field" value={head?.documentType ?? ""} disabled={!editable} maxLength={10} onChange={(e) => updateAll("documentType", e.target.value)} />
            </label>
            {editable ? (
              <label>Alacak hesabı
                <select className="field" value={PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? creditCode : ""} onChange={(e) => setCreditAccount(e.target.value)}>
                  {PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? null : <option value="">{creditCode || "Seçin"}</option>}
                  {PAYMENT_ALTERNATIVES.map((a) => <option key={a.code} value={a.code}>{a.code} {a.label}</option>)}
                </select>
              </label>
            ) : null}
            <label className="span-all">Açıklama
              <input className="field" value={head?.description ?? ""} disabled={!editable} maxLength={200}
                {...flag("description", codes.includes("extraction_failed") || !head?.description)}
                onChange={(e) => updateAll("description", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="panel" aria-labelledby="satir-baslik">
          <h2 id="satir-baslik" className="panel-pad">Yevmiye satırları</h2>
          <table className="lines">
            <thead>
              <tr>
                <th className="col-code">Hesap Kodu</th><th>Hesap Adı</th><th className="col-amount num">Borç (TL)</th><th className="col-amount num">Alacak (TL)</th>
                {editable ? <th className="col-del"><span className="visually-hidden">Sil</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.key}>
                  <td data-label="Hesap Kodu"><input className="field num-font" aria-label={`Satır ${i + 1} hesap kodu`} value={l.accountCode} disabled={!editable} inputMode="decimal"
                    {...flag(`code-${l.key}`, !l.accountCode)} onChange={(e) => { touch(`code-${l.key}`); update(l.key, { accountCode: e.target.value }); }} /></td>
                  <td data-label="Hesap Adı"><input className="field" aria-label={`Satır ${i + 1} hesap adı`} value={l.accountName} disabled={!editable} onChange={(e) => update(l.key, { accountName: e.target.value })} /></td>
                  <td data-label="Borç (TL)"><input className="field num" aria-label={`Satır ${i + 1} borç`} value={l.debit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.debit))}
                    {...flag(`debit-${l.key}`, amountsUnsure && !!l.debit)} onChange={(e) => { touch(`debit-${l.key}`); update(l.key, { debit: e.target.value }); }} /></td>
                  <td data-label="Alacak (TL)"><input className="field num" aria-label={`Satır ${i + 1} alacak`} value={l.credit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.credit))}
                    {...flag(`credit-${l.key}`, amountsUnsure && !!l.credit)} onChange={(e) => { touch(`credit-${l.key}`); update(l.key, { credit: e.target.value }); }} /></td>
                  {editable ? <td className="col-del"><button className="btn btn-quiet" type="button" aria-label={`Satır ${i + 1} sil`} disabled={lines.length <= 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>Sil</button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="totals">
            <div><dt>Borç</dt><dd className="num">{formatTrAmount(debit)}</dd></div>
            <div><dt>Alacak</dt><dd className="num">{formatTrAmount(credit)}</dd></div>
            <div><dt>KDV (191)</dt><dd className="num">{formatTrAmount(vat)}</dd></div>
          </dl>
        </section>

        {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
        {info ? <p role="status" className="muted">{info}</p> : null}

        <div className="actions">
          {editable ? (
            <>
              <button className="btn" type="button" disabled={busy} onClick={addLine}>Satır ekle</button>
              <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { if (await save()) { setInfo("Kaydedildi."); router.refresh(); } })}>Taslağı kaydet</button>
            </>
          ) : receipt.status === "approved" ? (
            <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { if (await call(`/api/receipts/${receipt.id}/reopen`, { method: "POST" })) router.refresh(); })}>
              Taslağa al
            </button>
          ) : null}
          <button className="btn" type="button" disabled={invalid} onClick={copy}>Satırları kopyala</button>
          {editable ? (
            <button className="btn btn-danger" type="button" disabled={busy}
              onClick={() => confirm("Bu taslak fiş silinsin mi?") && run(async () => { if (await call(`/api/receipts/${receipt.id}`, { method: "DELETE" })) router.push("/"); })}>
              Fişi sil
            </button>
          ) : null}
        </div>

        <div className="action-bar">
          <p className={balanced ? "balance balance-ok" : "balance balance-off"} aria-live="polite">
            {invalid ? "Tutar biçimi hatalı" : balanced ? "Borç ve alacak eşit" : debit !== credit ? `Fark ${formatTrAmount(Math.abs(debit - credit))} TL` : "Hesap kodu eksik"}
          </p>
          {editable ? (
            <button className="btn btn-primary btn-lg" type="button" disabled={busy || !balanced}
              onClick={() => run(async () => { if ((await save()) && (await call(`/api/receipts/${receipt.id}/approve`, { method: "POST" }))) router.refresh(); })}>
              {busy ? "Kaydediliyor" : "Onayla"}
            </button>
          ) : (
            <ExportButton receiptIds={[receipt.id]} label="Luca için Excel indir" primary />
          )}
        </div>
      </div>
    </div>
  );
}
