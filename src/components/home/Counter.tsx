"use client";

import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clipboardText } from "@/lib/luca/clipboard";
import { formatTrAmount } from "@/lib/money";
import { defaultPayment, journalFor, PAYMENTS, SAMPLES, shownAccountName, sourcesFor, type Payment, type Source } from "./samples";
import { AppWindow, Phone } from "./Frames";
import { Odometer, Roll } from "./Odometer";
import { Thermal } from "./Thermal";

/** The line made from the printed rows `hot` marks (Thermal's fiş izi), so the paper and the line light together. */
const same = (a: Source | null, b: Source | undefined) => !!a && !!b && a.kind === b.kind && (a.kind === "total" || (b.kind !== "total" && a.rate === b.rate));

const PRINTED: Record<Payment["id"], string> = { partner: "KREDİ KARTI", company: "KREDİ KARTI", cash: "NAKİT" };

/**
 * The homepage's one live thing (YON.md 3.3): pick a sample receipt and how it was paid; the lines come from the product's own
 * buildJournalLines with the default chart of accounts, and "Satırları kopyala" writes them in Luca Fiş Detayı order.
 * The receipt is on a phone that sits over the bottom-left corner of the window holding the Luca lines (YON.md 23.2). After a choice
 * only the changed digits of codes and amounts roll (Odometer, YON.md 23.3.3), never counting; rows stay keyed by position.
 * A new sample keeps the chosen payment (the strip prints that payment), so one choice never silently changes another.
 * The pickers sit above the window (no rail in it, YON 23.32); on a phone the window is a card under the phone (YON 23.15). A new sample swaps the paper in the
 * same DOM (one Web Animation), no remount.
 * The radios are uncontrolled and a choice renders in a transition: the click's frame paints only the native radio, and quick
 * choices drop the renders they overtake (INP, YON 23.22). autoComplete off: the browser does not restore a choice React never saw.
 * Pointing at a line marks the strip rows it came from (a pointer extra only: the rows are not focus stops). Server-rendered with sample A, so without script the table is there.
 */
export function Counter() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [payment, setPayment] = useState<Payment["id"]>(defaultPayment(SAMPLES[0]));
  const [copy, setCopy] = useState<"" | "ok" | "fail">("");
  const [hot, setHot] = useState<Source | null>(null);
  const [touched, setTouched] = useState(false);
  // Without script the pickers would move (CSS :checked) beside a receipt that never changes: they are disabled until hydrated.
  const [live, setLive] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- true only once the client runs the counter
  useEffect(() => setLive(true), []);
  // Rows at or past this index are new after a choice (Market has more lines): they drop in, the others stay keyed by position.
  const [kept, setKept] = useState(Infinity);
  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];
  const { lines, warnings, balanced } = journalFor(sample, payment);
  const sources = sourcesFor(sample);
  const debit = lines.reduce((s, l) => s + l.debitKurus, 0);
  const credit = lines.reduce((s, l) => s + l.creditKurus, 0);
  const vat = sample.receipt.vatLines;
  const slot = useRef<HTMLDivElement>(null);
  // On a phone the pickers sit under the card, whose height follows the sample: after a choice the page scrolls by what the
  // tapped picker moved, so it stays under the finger (jury tur 18: 60-154px jumps, a quick second tap hit the wrong chip).
  const anchor = useRef<{ el: HTMLElement; top: number } | null>(null);
  const hold = (el: HTMLElement) => { anchor.current = { el, top: el.getBoundingClientRect().top }; };
  useLayoutEffect(() => {
    const a = anchor.current;
    anchor.current = null;
    if (a) { const moved = a.el.getBoundingClientRect().top - a.top; if (Math.abs(moved) > 1) window.scrollBy(0, moved); }
  }, [sampleId, payment]);
  // "Dengede" pops only when the balance itself changes (YON 23.3.3), not on the first choice.
  const [bal, setBal] = useState(balanced);
  const [flips, setFlips] = useState(0);
  if (bal !== balanced) { setBal(balanced); setFlips((n) => n + 1); }
  // The new paper rises once it is committed (the choice renders in a transition, so not in the click's frame).
  const shown = useRef(sampleId);
  useLayoutEffect(() => {
    if (shown.current === sampleId) return;
    shown.current = sampleId;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The paper stays opaque: only its print changes, the new print rising 8px on the same paper (YON 23.28).
    slot.current?.querySelectorAll(".thermal-paper > *").forEach((el) => el.animate([{ opacity: 0.35, transform: "translateY(6px)" }, {}], { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }));
  }, [sampleId]);

  async function copyLines() {
    try {
      await navigator.clipboard.writeText(clipboardText(lines));
      setCopy("ok");
    } catch {
      setCopy("fail");
    }
  }

  const controls = (
    <div className="counter-controls">
      <fieldset className="segmented" disabled={!live}>
        <legend>Örnek fiş</legend>
        {SAMPLES.map((s) => (
          <label key={s.id}>
            <input type="radio" name="ornek-fis" value={s.id} autoComplete="off" defaultChecked={s.id === SAMPLES[0].id}
              onChange={(e) => { hold(e.currentTarget); startTransition(() => { setKept(lines.length); setSampleId(s.id); setCopy(""); setHot(null); setTouched(true); }); }} />
            <span>{s.label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="segmented" disabled={!live}>
        <legend>Ödeme</legend>
        {PAYMENTS.map((p) => (
          <label key={p.id}>
            <input type="radio" name="odeme" value={p.id} autoComplete="off" defaultChecked={p.id === defaultPayment(SAMPLES[0])} onChange={(e) => { hold(e.currentTarget); startTransition(() => { setPayment(p.id); setCopy(""); setTouched(true); }); }} />
            <span>{p.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );

  return (
    <div className="counter" data-ui data-touched={touched || undefined} suppressHydrationWarning>
      {/* Source order is the phone's reading order (phone, card, pickers): a slow first paint never draws a later part where an
          earlier one will land (jury tur 12: CLS 0.21). On desktop CSS lifts the pickers above the window (YON 23.28). */}
      <div className="counter-body">
        <Phone className="counter-phone">
          {/* "Fiş çekildi" turns to "Okundu" once in the load scenario (CSS, YON 23.28); the end state is the server's text. */}
          <p className="phone-head"><span className="phone-state"><span aria-hidden="true">Fiş çekildi</span><span>Okundu</span></span><span>{sample.label}</span></p>
          <div className="counter-slot" ref={slot}>
            <Thermal sample={sample} printedPayment={PRINTED[payment]} hot={hot} />
          </div>
          <div className="phone-read">
            <p><span>Okundu</span><span>Evrak No {sample.receipt.receiptNo}</span></p>
            <p><span>{lines.length} satır hazır</span><span>{balanced ? "Dengede" : "Dengesiz"}</span></p>
          </div>
        </Phone>
        <AppWindow title={`Fiş ${sample.receipt.receiptNo}, Luca satırları`} className="counter-win">
          <div className="counter-app">
            <div className="counter-sheet">
              {/* Phone: the receipt is above the card, so the card names it and its total; a choice and its paper stay on one screen. */}
              <p className="counter-chip"><span translate="no">{sample.receipt.vendorName}</span><span>TOPLAM <Odometer value={formatTrAmount(sample.receipt.totalKurus ?? 0)} /></span></p>
              <table className="counter-lines" onMouseLeave={() => setHot(null)}>
                <caption className="visually-hidden">Luca Fiş Detayı satırları</caption>
                <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className={i >= kept ? "counter-row counter-row-new" : "counter-row"} data-lit={same(hot, sources[i]) || undefined} onMouseEnter={() => setHot(sources[i])}>
                      <td><Odometer className="code odo-code" value={l.accountCode} /><span className="code-name"><Roll value={shownAccountName(l.accountName)} /></span></td>
                      <td className="num to-luca">{l.debitKurus ? <Odometer value={formatTrAmount(l.debitKurus)} /> : ""}</td>
                      <td className="num to-luca">{l.creditKurus ? <Odometer value={formatTrAmount(l.creditKurus)} /> : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="counter-foot">
                <p className="counter-balance" aria-live="polite">
                  <span className="counter-sum">Borç <Odometer value={formatTrAmount(debit)} /> · Alacak <Odometer value={formatTrAmount(credit)} /></span> ·{" "}
                  <span key={flips} data-pop={flips > 0 || undefined} className={`counter-state ${balanced ? "balance-ok" : "balance-off"}`}>{balanced ? "Dengede" : "Dengesiz"}</span>
                </p>
                <p className="counter-formula">
                  Matrah = {vat.map((v) => `${formatTrAmount(v.grossKurus)} - ${formatTrAmount(v.vatKurus ?? 0)}`).join(" ve ")}
                </p>
                <div className="counter-copy">
                  <button type="button" className="btn" onClick={copyLines} disabled={!live}>Satırları kopyala</button>
                  <p aria-live="polite" className="counter-status">
                    {copy === "ok" ? "Kopyalandı. Satırlar Luca Fiş Detayı kolon sırasında." : copy === "fail" ? "Panoya yazılamadı. Satırları seçip kopyalayın." : ""}
                  </p>
                </div>
                {warnings.map((w) => <p className="counter-warn" key={w.code}>{w.message}</p>)}
              </div>
              {/* The file this fiş goes into: the window's foot holds the story's end, not empty surface (YON 23.24). */}
              <p className="counter-file"><span className="ui-file-name">luca-fisler-{(sample.receipt.date ?? "").replaceAll("-", "")}.xlsx</span><span className="ui-meta">1 fiş, {lines.length} satır</span></p>
            </div>
          </div>
        </AppWindow>
      </div>
      {controls}
    </div>
  );
}
