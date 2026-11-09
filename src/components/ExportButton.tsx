"use client";

import { useRouter } from "next/navigation";
import { addTransitionType, startTransition, useState } from "react";

export function ExportButton({ receiptIds, month, label = "Luca için indir", primary = false }: { receiptIds?: string[]; month?: string; label?: string; primary?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/exports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(receiptIds ? { receiptIds } : { firmId: document.querySelector<HTMLElement>(".app")?.dataset.firm, month: month || undefined }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = res ? await res.json().catch(() => null) : null;
      setMessage(body?.error ?? "Dosya hazırlanamadı. Tekrar deneyin.");
      return;
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "luca-fisler.xlsx";
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
    const remaining = Number(res.headers.get("x-remaining-receipts") ?? 0);
    setMessage(remaining > 0 ? `Luca bir dosyada en fazla 50 fiş alır. ${remaining} fiş kaldı, bir sonraki dosya için tekrar indirin.` : "");
    // Downloaded receipts become Aktarıldı: the type moves their rows out toward that tab and rolls the tab counts.
    startTransition(() => { addTransitionType("aktarim"); router.refresh(); });
  }

  return (
    <div className="actions">
      <button className={primary ? "btn btn-primary btn-lg" : "btn"} type="button" onClick={download} disabled={busy}>{busy ? "Hazırlanıyor…" : label}</button>
      {message ? <p role="status" className="muted">{message}</p> : null}
    </div>
  );
}
