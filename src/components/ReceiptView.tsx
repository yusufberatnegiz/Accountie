import Link from "next/link";
import type { ReceiptDetail } from "@/db/queries";
import type { Rules } from "@/lib/default-rules";
import { ReviewEditor } from "@/components/ReviewEditor";
import { formatTrAmount } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/status";

/** Review screen body; the page and the dev preview both render it. */
export function ReceiptView({ receipt, rules }: { receipt: ReceiptDetail; rules: Rules }) {
  const vknUnsure = receipt.warnings.some((w) => w.code === "tax_number_invalid");
  return (
    <main id="icerik" tabIndex={-1} className="page">
      <div className="page-head">
        <div>
          <p className="crumb"><Link href="/panel">Fişler</Link></p>
          <h1>{receipt.vendorName ?? "Okunamayan fiş"}</h1>
          <p className="meta">
            <span className={`status status-${receipt.status}`}>{STATUS_LABELS[receipt.status]}</span>
            {receipt.totalKurus !== null ? <span className="num-font">{formatTrAmount(receipt.totalKurus)} TL</span> : null}
            {receipt.taxNumber ? <span className={vknUnsure ? "num-font flagged" : "num-font"}>VKN {receipt.taxNumber}{vknUnsure ? " (kontrol edin)" : ""}</span> : null}
          </p>
        </div>
      </div>
      <ReviewEditor receipt={receipt} rules={rules} />
    </main>
  );
}
