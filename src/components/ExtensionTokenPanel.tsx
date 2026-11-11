"use client";

import { useState } from "react";
import { EXTENSION_ID } from "@/lib/extension-id";

type Runtime = { sendMessage(id: string, message: unknown, callback: (response?: { ok?: boolean }) => void): void; lastError?: unknown };

/** Chrome lets this site reach the extension only when it is installed and lists the site (externally_connectable). */
const extensionRuntime = () => (globalThis as { chrome?: { runtime?: Partial<Runtime> } }).chrome?.runtime as Runtime | undefined;

export function ExtensionTokenPanel() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(): Promise<string | null> {
    const res = await fetch("/api/extension-tokens", { method: "POST" }).catch(() => null);
    if (!res?.ok) return null;
    return (await res.json()).token as string;
  }

  /** Makes a key and hands it straight to the extension; when the extension cannot be reached, shows it to copy instead. */
  async function connect() {
    setBusy(true);
    setMessage("");
    setToken("");
    const made = await create();
    if (!made) {
      setBusy(false);
      return setMessage("İşlem yapılamadı. Tekrar deneyin.");
    }
    const runtime = extensionRuntime();
    const fallback = () => {
      setToken(made);
      setMessage("Eklentiye ulaşılamadı (kurulu değil ya da eski sürüm). Anahtarı kopyalayıp eklentiye yapıştırın.");
    };
    if (!runtime?.sendMessage) {
      setBusy(false);
      return fallback();
    }
    try {
      runtime.sendMessage(EXTENSION_ID, { type: "accountie-token", token: made }, (response) => {
        setBusy(false);
        if (runtime.lastError || !response?.ok) return fallback();
        setMessage("Eklenti bağlandı. Eklentiyi açınca onaylı fişler gelir. Anahtar her kullanımda 30 gün uzar.");
      });
    } catch {
      setBusy(false);
      fallback();
    }
  }

  async function revoke() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/extension-tokens", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMessage("İşlem yapılamadı. Tekrar deneyin.");
    setToken("");
    setMessage("Eklenti anahtarı iptal edildi. Eklenti artık onaylı fişleri okuyamaz.");
  }

  async function copy() {
    const copied = await navigator.clipboard.writeText(token).then(() => true, () => false);
    setMessage(copied ? "Anahtar panoya kopyalandı. Eklentiye yapıştırın." : "Panoya kopyalanamadı. Anahtarı seçip elle kopyalayın.");
  }

  return (
    <div className="stack">
      <div className="actions">
        <button className="btn btn-primary" type="button" onClick={connect} disabled={busy}>Eklentiye bağla</button>
        <button className="btn btn-danger" type="button" onClick={revoke} disabled={busy}>Anahtarı iptal et</button>
      </div>
      {token ? (
        <div className="actions">
          <input className="field num-font" readOnly value={token} aria-label="Eklenti anahtarı" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn" type="button" onClick={copy}>Kopyala</button>
        </div>
      ) : null}
      {message ? <p role="status" className="muted">{message}</p> : null}
    </div>
  );
}
