"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { clipboardText } from "@/lib/luca/clipboard";
import { formatTrAmount } from "@/lib/money";
import { defaultPayment, journalFor, PAYMENTS, SAMPLES, shownAccountName, sourcesFor, type Payment, type Source } from "./samples";
import { Thermal } from "./Thermal";

const PRINTED: Record<Payment["id"], string> = { partner: "KREDİ KARTI", company: "KREDİ KARTI", cash: "NAKİT" };

/** A total that counts to its new value when the sample changes (YON.md 6.6 "rolling figures"); the first paint is the final value. */
function useRolling(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const k = reduce ? 1 : Math.min(1, (t - t0) / 700);
      const v = Math.round(start + (target - start) * (1 - (1 - k) ** 3));
      from.current = v;
      setShown(v);
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target]);
  return shown;
}

/**
 * The homepage's one live thing (YON.md 3.3): pick a sample receipt and how it was paid; the lines come from the product's own
 * buildJournalLines with the default chart of accounts, and "Satırları kopyala" writes them in Luca Fiş Detayı order.
 * The strip prints, the lines arrive one by one with their amounts, the totals count and "Dengede" lights last.
 * Pointing at a line marks the strip rows it came from. Server-rendered with sample A, so without script the table is there.
 */
export function Counter() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [payment, setPayment] = useState<Payment["id"]>(defaultPayment(SAMPLES[0]));
  const [copy, setCopy] = useState<"" | "ok" | "fail">("");
  const [hot, setHot] = useState<Source | null>(null);
  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];
  const { lines, warnings, balanced } = journalFor(sample, payment);
  const sources = sourcesFor(sample);
  const debit = useRolling(lines.reduce((s, l) => s + l.debitKurus, 0));
  const credit = useRolling(lines.reduce((s, l) => s + l.creditKurus, 0));
  const key = `${sample.id}-${payment}`;
  const vat = sample.receipt.vatLines;

  async function copyLines() {
    try {
      await navigator.clipboard.writeText(clipboardText(lines));
      setCopy("ok");
    } catch {
      setCopy("fail");
    }
  }

  return (
    <div className="counter" data-ui style={{ "--rows": lines.length } as CSSProperties}>
      <div className="counter-controls">
        <fieldset className="segmented">
          <legend>Örnek fiş</legend>
          {SAMPLES.map((s) => (
            <label key={s.id}>
              <input type="radio" name="ornek-fis" value={s.id} checked={s.id === sampleId}
                onChange={() => { setSampleId(s.id); setPayment(defaultPayment(s)); setCopy(""); setHot(null); }} />
              <span>{s.label}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="segmented">
          <legend>Ödeme</legend>
          {PAYMENTS.map((p) => (
            <label key={p.id}>
              <input type="radio" name="odeme" value={p.id} checked={p.id === payment} onChange={() => { setPayment(p.id); setCopy(""); }} />
              <span>{p.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="counter-body">
        <div className="counter-slot" key={sample.id}>
          <Thermal sample={sample} printedPayment={PRINTED[payment]} hot={hot} />
        </div>

        <div className="counter-sheet">
          <table className="counter-lines" onMouseLeave={() => setHot(null)}>
            <caption className="visually-hidden">Luca Fiş Detayı satırları. Bir satıra gelince fişte geldiği yer işaretlenir.</caption>
            <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={`${key}-${i}`} className="counter-row" style={{ "--i": i } as CSSProperties} tabIndex={0}
                  onMouseEnter={() => setHot(sources[i])} onFocus={() => setHot(sources[i])} onBlur={() => setHot(null)}>
                  <td><span className="code" translate="no">{l.accountCode}</span><span className="code-name">{shownAccountName(l.accountName)}</span></td>
                  <td className="num to-luca">{l.debitKurus ? formatTrAmount(l.debitKurus) : ""}</td>
                  <td className="num to-luca">{l.creditKurus ? formatTrAmount(l.creditKurus) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="counter-foot">
            <p className="counter-balance">
              Borç <span className="to-luca">{formatTrAmount(debit)}</span> · Alacak <span className="to-luca">{formatTrAmount(credit)}</span> ·{" "}
              <span key={key} className={`counter-state ${balanced ? "balance-ok" : "balance-off"}`}>{balanced ? "Dengede" : "Dengesiz"}</span>
            </p>
            <p className="counter-formula">
              Matrah = {vat.map((v) => `${formatTrAmount(v.grossKurus)} - ${formatTrAmount(v.vatKurus ?? 0)}`).join(" ve ")}
            </p>
            {warnings.map((w) => <p className="counter-warn" key={w.code}>{w.message}</p>)}
            <div className="counter-copy">
              <button type="button" className="btn" onClick={copyLines}>Satırları kopyala</button>
              <p aria-live="polite" className="counter-status">
                {copy === "ok" ? "Kopyalandı. Satırlar Luca Fiş Detayı kolon sırasında." : copy === "fail" ? "Panoya yazılamadı. Satırları seçip kopyalayın." : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
