"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";

/**
 * The list's bulk approve and bulk delete. The status line is always on the page and outlives the buttons: once every draft is
 * approved or deleted the buttons go, but the result is still said and focus lands on it.
 */
export function BulkActions({ approveIds, deleteIds }: { approveIds: string[]; deleteIds: string[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"approve" | "delete" | null>(null);
  const status = useRef<HTMLParagraphElement>(null);

  async function post(kind: "approve" | "delete", ids: string[], question: string) {
    if (!confirm(question)) return;
    setBusy(kind);
    setMessage("");
    const res = await fetch(`/api/receipts/bulk-${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => null);
    setBusy(null);
    const body = res?.ok ? ((await res.json()) as { approved?: number; deleted?: number; skipped: number }) : null;
    if (!body) setMessage(kind === "approve" ? "Fişler onaylanamadı. Tekrar deneyin." : "Fişler silinemedi. Tekrar deneyin.");
    else if (kind === "approve") setMessage(`${body.approved} fiş onaylandı.${body.skipped ? ` ${body.skipped} fiş kontrol bekliyor.` : ""}`);
    else setMessage(`${body.deleted} taslak silindi.${body.skipped ? ` ${body.skipped} fiş artık taslak olmadığı için silinmedi.` : ""}`);
    status.current?.focus();
    if (body) startTransition(() => router.refresh());
  }

  return (
    // With nothing to do and nothing to say, only the empty status line stays: no bar is drawn.
    <div className={approveIds.length > 1 || deleteIds.length > 1 || message ? "list-foot list-foot-actions" : "list-foot-actions"}>
      {approveIds.length > 1 ? (
        <button className="btn" type="button" disabled={busy !== null}
          onClick={() => post("approve", approveIds, `Uyarısı olmayan ${approveIds.length} taslak fiş, tek tek açılmadan onaylansın mı? Onaylanan fişler Luca dosyasına girer.`)}>
          {busy === "approve" ? "Onaylanıyor…" : `Uyarısız ${approveIds.length} fişi onayla`}
        </button>
      ) : null}
      {/* Kept at the right end even alone, so a habitual click on the approve spot never lands on delete. */}
      {deleteIds.length > 1 ? (
        <button className="btn btn-danger bulk-delete" type="button" disabled={busy !== null}
          onClick={() => post("delete", deleteIds, `Listedeki ${deleteIds.length} taslak fiş silinsin mi? Onaylı ve aktarılmış fişler silinmez. Silinen fiş geri getirilemez.`)}>
          {busy === "delete" ? "Siliniyor…" : `${deleteIds.length} taslağı sil`}
        </button>
      ) : null}
      <p ref={status} role="status" tabIndex={-1} className="muted bulk-status">{message}</p>
    </div>
  );
}
