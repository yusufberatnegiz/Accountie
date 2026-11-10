import { RulesEditor } from "@/components/RulesEditor";
import { VendorRulesList } from "@/components/VendorRulesList";
import type { VendorRule } from "@/db/queries";
import type { Account, RuleRow } from "@/lib/default-rules";

/** Rules screen body; the page and the dev preview both render it. */
export function RulesView({ rows, vendorRules, firmName, plan }: { rows: RuleRow[]; vendorRules?: VendorRule[]; firmName?: string; plan?: Account[] }) {
  const n = (kind: RuleRow["kind"]) => rows.filter((r) => r.kind === kind).length;
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-settings">
      <div className="title-row">
        <div className="title-text">
          <h1>Hesap kuralları</h1>
          <p className="finding">Fişler {n("expense")} gider, {n("vat")} KDV ve {n("payment")} ödeme kuralıyla {firmName ? `${firmName} firmasının` : "sizin"} hesap planındaki kodlara yazılır.</p>
        </div>
      </div>
      <RulesEditor rows={rows} plan={plan} />
      {vendorRules && firmName ? <VendorRulesList rules={vendorRules} firmName={firmName} /> : null}
    </main>
  );
}
