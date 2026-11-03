import { RulesEditor } from "@/components/RulesEditor";
import type { RuleRow } from "@/lib/default-rules";

/** Rules screen body; the page and the dev preview both render it. */
export function RulesView({ rows }: { rows: RuleRow[] }) {
  const n = (kind: RuleRow["kind"]) => rows.filter((r) => r.kind === kind).length;
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-settings">
      <div className="title-row">
        <div className="title-text">
          <p className="crumb" translate="no">Accountie</p>
          <h1>Hesap kuralları</h1>
          <p className="finding">Fişler {n("expense")} gider, {n("vat")} KDV ve {n("payment")} ödeme kuralıyla sizin hesap planınızdaki kodlara yazılır.</p>
        </div>
      </div>
      <RulesEditor rows={rows} />
    </main>
  );
}
