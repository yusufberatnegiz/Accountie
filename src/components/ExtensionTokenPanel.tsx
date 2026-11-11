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
    if (busy) return;
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
    if (busy || !confirm("Eklenti anahtarı iptal edilsin mi? Eklenti, yeniden bağlanana kadar onaylı fişleri okuyamaz.")) return;
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
        {/* aria-disabled, not disabled: the pressed button keeps keyboard focus while the request runs. */}
        <button className="btn btn-primary" type="button" onClick={connect} aria-disabled={busy || undefined} data-busy={busy || undefined}>{busy ? "Bağlanıyor…" : "Eklentiye bağla"}</button>
        <button className="btn btn-danger" type="button" onClick={revoke} aria-disabled={busy || undefined}>Anahtarı iptal et</button>
      </div>
      {token ? (
        <div className="actions">
          <input className="field num-font" readOnly value={token} aria-label="Eklenti anahtarı" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn" type="button" onClick={copy}>Kopyala</button>
        </div>
      ) : null}
      {/* Always mounted, so a screen reader hears the result when the text arrives. */}
      <p role="status" className="muted">{message}</p>
    </div>
  );
}
