"use client";

import { useState } from "react";

export function ExtensionTokenPanel() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(method: "POST" | "DELETE") {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/extension-tokens", { method }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMessage("İşlem yapılamadı. Tekrar deneyin.");
    if (method === "DELETE") {
      setToken("");
      return setMessage("Eklenti anahtarı iptal edildi. Eklenti artık fiş çekemez.");
    }
    const body = await res.json();
    setToken(body.token);
    setMessage(`Anahtar ${new Date(body.expiresAt).toLocaleString("tr-TR")} tarihine kadar geçerli. Eski anahtar artık çalışmaz.`);
  }

  async function copy() {
    await navigator.clipboard.writeText(token).catch(() => null);
    setMessage("Anahtar panoya kopyalandı. Eklentiye yapıştırın.");
  }

  return (
    <div style={{ display: "grid", gap: "var(--s3)" }}>
      <div className="actions">
        <button className="btn" type="button" onClick={() => call("POST")} disabled={busy}>Eklenti anahtarı oluştur</button>
        <button className="btn btn-danger" type="button" onClick={() => call("DELETE")} disabled={busy}>Anahtarı iptal et</button>
      </div>
      {token ? (
        <div className="actions">
          <input className="field mono" readOnly value={token} aria-label="Eklenti anahtarı" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn" type="button" onClick={copy}>Kopyala</button>
        </div>
      ) : null}
      {message ? <p role="status" className="muted">{message}</p> : null}
    </div>
  );
}
