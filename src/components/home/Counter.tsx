"use client";

import { useState, type CSSProperties } from "react";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/default-rules";
import { clipboardText } from "@/lib/luca/clipboard";
import { formatTrAmount } from "@/lib/money";
import { journalFor, SAMPLES, shownAccountName } from "./samples";

const lucaDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "");
const PAYMENTS: PaymentMethod[] = ["card", "cash"];
const PRINTED_PAYMENT: Record<PaymentMethod, string> = { card: "KREDİ KARTI", cash: "NAKİT", other: "DİĞER" };

/**
 * The homepage's one live thing (YON.md 3.3): pick a sample receipt and a payment, the lines come from the product's own
 * buildJournalLines with the default chart of accounts, and "Satırları kopyala" writes them in Luca Fiş Detayı order.
 * Server-rendered with sample A, so without script the table is still there.
 */
export function Counter() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [payment, setPayment] = useState<PaymentMethod>(SAMPLES[0].receipt.paymentMethod);
  const [copy, setCopy] = useState<"" | "ok" | "fail">("");
  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];
  const { lines, warnings, balanced } = journalFor(sample, payment);
  const r = sample.receipt;
  const total = r.totalKurus ?? 0;
  const vatTotal = r.vatLines.reduce((s, v) => s + (v.vatKurus ?? 0), 0);
  const debit = lines.reduce((s, l) => s + l.debitKurus, 0);
  const credit = lines.reduce((s, l) => s + l.creditKurus, 0);
  const key = `${sample.id}-${payment}`;

  async function copyLines() {
    try {
      await navigator.clipboard.writeText(clipboardText(lines));
      setCopy("ok");
    } catch {
      setCopy("fail");
    }
  }

  return (
    <div className="counter" data-ui>
      <div className="counter-controls">
        <fieldset className="segmented segmented-3">
          <legend>Örnek fiş</legend>
          {SAMPLES.map((s) => (
            <label key={s.id}>
              <input type="radio" name="ornek-fis" value={s.id} checked={s.id === sampleId}
                onChange={() => { setSampleId(s.id); setPayment(s.receipt.paymentMethod); setCopy(""); }} />
              <span>{s.label}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="segmented segmented-2">
          <legend>Ödeme</legend>
          {PAYMENTS.map((p) => (
            <label key={p}>
              <input type="radio" name="odeme" value={p} checked={p === payment} onChange={() => { setPayment(p); setCopy(""); }} />
              <span>{PAYMENT_LABELS[p]}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="counter-body">
        <div className="thermal" aria-label="Fişin termal baskısı" role="group" translate="no">
          <p className="thermal-vendor">{r.vendorName}</p>
          <p className="thermal-row"><span>TARİH {lucaDate(r.date)}</span><span>FİŞ NO {r.receiptNo}</span></p>
          {r.vatLines.map((v) => (
            <p className="thermal-row" key={v.rate}><span>KDV %{v.rate}</span><span>*{formatTrAmount(v.vatKurus ?? 0)}</span></p>
          ))}
          <p className="thermal-row"><span>TOPKDV</span><span>*{formatTrAmount(vatTotal)}</span></p>
          <p className="thermal-row thermal-total"><span>TOPLAM</span><span>*{formatTrAmount(total)}</span></p>
          <p className="thermal-row"><span key={payment}>{PRINTED_PAYMENT[payment]}</span><span>*{formatTrAmount(total)}</span></p>
        </div>

        <table className="counter-lines">
          <caption className="visually-hidden">Luca Fiş Detayı satırları</caption>
          <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={`${key}-${i}`} className="counter-row" style={{ "--i": i } as CSSProperties}>
                <td><span className="code" translate="no">{l.accountCode}</span><span className="code-name">{shownAccountName(l.accountName)}</span></td>
                <td className="num to-luca">{l.debitKurus ? formatTrAmount(l.debitKurus) : ""}</td>
                <td className="num to-luca">{l.creditKurus ? formatTrAmount(l.creditKurus) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="counter-foot">
        <p className="counter-balance">
          Borç <span className="to-luca">{formatTrAmount(debit)}</span> · Alacak <span className="to-luca">{formatTrAmount(credit)}</span> ·{" "}
          <span className={balanced ? "balance-ok" : "balance-off"}>{balanced ? "Dengede" : "Dengesiz"}</span>
        </p>
        <p className="counter-formula">
          Matrah = {r.vatLines.map((v) => `${formatTrAmount(v.grossKurus)} - ${formatTrAmount(v.vatKurus ?? 0)}`).join(" ve ")}
        </p>
        {warnings.map((w) => <p className="counter-warn" key={w.code}>{w.message}</p>)}
        <div className="counter-copy">
          <button type="button" className="btn btn-primary" onClick={copyLines}>Satırları kopyala</button>
          <p aria-live="polite" className="counter-status">
            {copy === "ok" ? "Kopyalandı. Luca Fiş Detayı'na yapıştırabilirsiniz." : copy === "fail" ? "Panoya yazılamadı. Satırları seçip kopyalayın." : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
