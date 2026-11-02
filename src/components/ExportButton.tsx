"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExportButton({ receiptIds, label = "Luca için indir", primary = false }: { receiptIds?: string[]; label?: string; primary?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/exports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ receiptIds }) }).catch(() => null);
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
    router.refresh();
  }

  return (
    <div className="actions">
      <button className={primary ? "btn btn-primary btn-lg" : "btn"} type="button" onClick={download} disabled={busy}>{busy ? "Hazırlanıyor" : label}</button>
      {message ? <p role="status" className="muted">{message}</p> : null}
    </div>
  );
}
