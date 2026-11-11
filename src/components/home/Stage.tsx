"use client";

import { startTransition, useLayoutEffect, useRef, useState } from "react";
import { formatTrAmount } from "@/lib/money";
import { Odometer } from "./Odometer";
import { AKARYAKIT, journalFor, PAYMENTS, SAMPLES, shownAccountName, type Payment } from "./samples";
import { Thermal } from "./Thermal";

// The receipts the stage offers: the counter's three plus the fuel receipt, each with its own rates and lines.
const STAGE = [SAMPLES[0], AKARYAKIT, SAMPLES[2], SAMPLES[1]];
const PRINTED: Record<Payment["id"], string> = { partner: "KREDİ KARTI", company: "KREDİ KARTI", cash: "NAKİT" };

/**
 * The homepage's live thing, brought back from the old counter on the new stage: pick a sample receipt and how it was paid; the
 * Luca lines come from the product's own buildJournalLines with the default chart of accounts. Only changed digits roll
 * (Odometer); the new print rises on the same paper. Server-rendered with the first receipt, so without script the stage is whole.
 */
export function Stage() {
  const [id, setId] = useState(STAGE[0].id);
  const [pay, setPay] = useState<Payment["id"]>("partner");
  const sample = STAGE.find((s) => s.id === id) ?? STAGE[0];
  const { lines } = journalFor(sample, pay);
  const total = formatTrAmount(lines.reduce((s, l) => s + l.creditKurus, 0));
  const vat = sample.receipt.vatLines.find((v) => (v.vatKurus ?? 0) > 0);
  const paper = useRef<HTMLDivElement>(null);
  const shown = useRef(id);
  useLayoutEffect(() => {
    if (shown.current === id) return;
    shown.current = id;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    paper.current?.querySelectorAll(".thermal-paper > *").forEach((el) =>
      el.animate([{ opacity: 0.35, transform: "translateY(6px)" }, {}], { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }));
  }, [id]);
  // The KDV line ends on the highlighted 191 row, wherever the receipt's line count puts it.
  const plate = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const p = plate.current, row = p?.querySelector<HTMLElement>(".l-hot"), line = p?.querySelector<HTMLElement>(".l-flight");
      if (!p || !row || !line) return;
      // Offsets, not client rects: the ledger may still be mid-rise (a transform) when this runs.
      let y = row.offsetHeight / 2;
      for (let el: HTMLElement | null = row; el && el !== p; el = el.offsetParent as HTMLElement | null) y += el.offsetTop;
      line.style.top = `${y}px`;
    };
    place();
    addEventListener("resize", place);
    return () => removeEventListener("resize", place);
  }, [id, pay]);

  const chip =(on: boolean, label: string, pick: () => void) => (
    <button key={label} type="button" className="l-chip" aria-pressed={on} onClick={() => startTransition(pick)}>{label}</button>
  );

  return (
    <>
      <div className="l-pick">
        <div role="group" aria-label="Örnek fiş">{STAGE.map((s) => chip(s.id === id, s.label, () => setId(s.id)))}</div>
        <div role="group" aria-label="Ödeme">{PAYMENTS.map((p) => chip(p.id === pay, p.label, () => setPay(p.id)))}</div>
      </div>
      <div className="l-plate" ref={plate}>
        <div className="l-receipt" ref={paper}><Thermal sample={sample} printedPayment={PRINTED[pay]} hot={vat ? { kind: "vat", rate: vat.rate } : null} /></div>
        {vat ? <span className="l-flight" aria-hidden="true"><span><Odometer value={formatTrAmount(vat.vatKurus ?? 0)} /></span></span> : null}
        <figure className="l-ledger">
          <figcaption><b>Fiş {sample.receipt.receiptNo} · {sample.label}</b><span className="status status-draft">Kontrol bekliyor</span></figcaption>
          <table>
            <thead><tr><th scope="col">Hesap</th><th scope="col">Açıklama</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                // Keyed by position: a row that stays rolls its digits, a new one simply appears.
                <tr key={i} className={l.accountCode.startsWith("191") && l === lines.find((x) => x.accountCode.startsWith("191")) ? "l-hot" : undefined}>
                  <td className="to-luca code" translate="no"><Odometer value={l.accountCode} /></td>
                  <td>{shownAccountName(l.accountName)}</td>
                  <td className="num">{l.debitKurus ? <Odometer value={formatTrAmount(l.debitKurus)} /> : ""}</td>
                  <td className="num">{l.creditKurus ? <Odometer value={formatTrAmount(l.creditKurus)} /> : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="l-balance"><span>Fark yok, dengede</span><span className="num">Borç <Odometer value={total} /> · Alacak <Odometer value={total} /> · 0,00 ✓</span></p>
        </figure>
      </div>
    </>
  );
}
