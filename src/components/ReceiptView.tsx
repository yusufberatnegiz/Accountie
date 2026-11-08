import type { ReceiptDetail, VendorRule } from "@/db/queries";
import type { Rules } from "@/lib/default-rules";
import { ReviewEditor, type NextDraft } from "@/components/ReviewEditor";

/** Review screen body; the page and the dev preview both render it. The title row lives in the editor: its finding is live. */
export function ReceiptView({ receipt, rules, next = null, learned = null, base = "/panel" }: { receipt: ReceiptDetail; rules: Rules; next?: NextDraft; learned?: VendorRule | null; base?: string }) {
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-detail">
      <ReviewEditor receipt={receipt} rules={rules} next={next} learned={learned} base={base} />
    </main>
  );
}
