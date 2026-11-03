import type { ReceiptDetail } from "@/db/queries";
import type { Rules } from "@/lib/default-rules";
import { ReviewEditor } from "@/components/ReviewEditor";

/** Review screen body; the page and the dev preview both render it. The title row lives in the editor: its finding is live. */
export function ReceiptView({ receipt, rules, base = "/panel" }: { receipt: ReceiptDetail; rules: Rules; base?: string }) {
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-detail">
      <ReviewEditor receipt={receipt} rules={rules} base={base} />
    </main>
  );
}
