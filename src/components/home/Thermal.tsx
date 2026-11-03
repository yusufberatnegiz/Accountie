import type { CSSProperties } from "react";
import { formatTrAmount } from "@/lib/money";
import type { Sample, Source } from "./samples";
import "./thermal.css";

const lucaDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "");

/** Which printed rows a traced journal line came from. */
const lit = (hot: Source | null | undefined, row: Source) =>
  !!hot && hot.kind === row.kind && (hot.kind === "total" || (row.kind !== "total" && hot.rate === row.rate));

/**
 * The thermal strip, drawn in code (never a photo): items with their rate, TOPKDV, TOPLAM, payment.
 * A single-rate receipt prints TOPKDV once; a multi-rate one prints KDV per rate, as an ÖKC does.
 * `hot` marks the rows a journal line was made from (the panel's fiş izi). Server and client safe: no hooks.
 */
export function Thermal({ sample, printedPayment, hot, compact }: { sample: Sample; printedPayment: string; hot?: Source | null; compact?: boolean }) {
  const r = sample.receipt;
  const total = r.totalKurus ?? 0;
  const vatTotal = r.vatLines.reduce((s, v) => s + (v.vatKurus ?? 0), 0);
  const multi = r.vatLines.length > 1;
  let n = 0;
  const row = (key: string, cls: string, src: Source | null, a: string, b: string) => (
    <p key={key} className={`thermal-row ${cls}`} data-lit={(src && lit(hot, src)) || undefined} style={{ "--p": n++ } as CSSProperties}>
      <span>{a}</span><span>{b}</span>
    </p>
  );
  return (
    <div className={`thermal${compact ? " thermal-compact" : ""}`} aria-label="Fişin termal baskısı" role="group" translate="no">
      <div className="thermal-paper">
        <p className="thermal-vendor">{r.vendorName}</p>
        {row("date", "", null, "TARİH", lucaDate(r.date))}
        {row("no", "", null, "FİŞ NO", r.receiptNo ?? "")}
        <div className="thermal-items">
          {sample.items.map((it) => (
            <p key={it.name} className="thermal-row thermal-item" data-lit={lit(hot, { kind: "items", rate: it.rate }) || undefined} style={{ "--p": n++ } as CSSProperties}>
              <span>{it.name}</span><span>%{it.rate} *{formatTrAmount(it.kurus)}</span>
            </p>
          ))}
        </div>
        {multi ? r.vatLines.map((v) => row(`vat-${v.rate}`, "", { kind: "vat", rate: v.rate }, `KDV %${v.rate}`, `*${formatTrAmount(v.vatKurus ?? 0)}`)) : null}
        {row("topkdv", "thermal-sep", multi ? null : { kind: "vat", rate: r.vatLines[0]?.rate ?? 0 }, "TOPKDV", `*${formatTrAmount(vatTotal)}`)}
        {row("total", "thermal-total", { kind: "total" }, "TOPLAM", `*${formatTrAmount(total)}`)}
        {row("pay", "", { kind: "total" }, printedPayment, `*${formatTrAmount(total)}`)}
      </div>
    </div>
  );
}
