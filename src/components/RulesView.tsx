import { RulesEditor } from "@/components/RulesEditor";
import type { RuleRow } from "@/lib/default-rules";

/** Rules screen body; the page and the dev preview both render it. */
export function RulesView({ rows }: { rows: RuleRow[] }) {
  return (
    <main id="icerik" tabIndex={-1} className="page">
      <div className="page-head">
        <div>
          <h1>Hesap kuralları</h1>
          <p>Fiş türü, KDV oranı ve ödeme şekline göre hangi hesabın önerileceğini kendi Luca hesap planınıza göre ayarlayın.</p>
        </div>
      </div>
      <RulesEditor rows={rows} />
    </main>
  );
}
