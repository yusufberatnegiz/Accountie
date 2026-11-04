"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

/** Approves at once the drafts the list shows without a warning; the server checks each again and skips any that do not balance. */
export function BulkApproveButton({ receiptIds }: { receiptIds: string[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const n = receiptIds.length;

  async function approve() {
    if (!confirm(`Uyarısı olmayan ${n} taslak fiş, tek tek açılmadan onaylansın mı? Onaylanan fişler Luca dosyasına girer.`)) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/receipts/bulk-approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: receiptIds }) }).catch(() => null);
    setBusy(false);
    const body = res?.ok ? ((await res.json()) as { approved: number; skipped: number }) : null;
    if (!body) return setMessage("Fişler onaylanamadı. Tekrar deneyin.");
    setMessage(`${body.approved} fiş onaylandı.${body.skipped ? ` ${body.skipped} fiş kontrol bekliyor.` : ""}`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="actions">
      <button className="btn" type="button" onClick={approve} disabled={busy}>{busy ? "Onaylanıyor…" : `Uyarısız ${n} fişi onayla`}</button>
      {message ? <p role="status" className="muted">{message}</p> : null}
    </div>
  );
}
