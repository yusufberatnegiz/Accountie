import type { ReceiptDetail, VendorRule } from "@/db/queries";
import type { Rules } from "@/lib/default-rules";
import { ReviewEditor, type NextDraft } from "@/components/ReviewEditor";

/** Review screen body; the page and the dev preview both render it. The title row lives in the editor: its finding is live. */
export function ReceiptView({ receipt, rules, next = null, learned = null, base = "/panel", plan = [], postable = [], mismatched = [], inList }: { receipt: ReceiptDetail; rules: Rules; next?: NextDraft; learned?: VendorRule | null; base?: string; plan?: { code: string; name: string }[]; postable?: { code: string; name: string }[]; mismatched?: string[]; inList?: { list: string; open: string } }) {
  // keyed by receipt: in the list, going from one receipt to the next must not carry the first one's edited lines over.
  const editor = <ReviewEditor key={receipt.id} receipt={receipt} rules={rules} next={next} learned={learned} base={base} plan={plan} postable={postable} mismatched={mismatched} inList={inList} />;
  // Under its row the list's own <main> holds it, so it is a plain block there.
  return inList ? <div className="row-detail-body">{editor}</div> : <main id="icerik" tabIndex={-1} className="canvas canvas-detail">{editor}</main>;
}
