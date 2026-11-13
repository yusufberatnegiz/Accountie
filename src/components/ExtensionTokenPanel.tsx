"use client";

import { useState } from "react";
import { EXTENSION_IDS, EXTENSION_STORE_URL } from "@/lib/extension-id";

type Runtime = { sendMessage(id: string, message: unknown, callback: (response?: { ok?: boolean }) => void): void; lastError?: unknown };

/** Chrome lets this site reach the extension only when it is installed and lists the site (externally_connectable). */
const extensionRuntime = () => (globalThis as { chrome?: { runtime?: Partial<Runtime> } }).chrome?.runtime as Runtime | undefined;

/** Offers the key to one extension id; true when that extension took it. A missing extension answers with lastError. */
function offer(runtime: Runtime, id: string, token: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      runtime.sendMessage(id, { type: "accountie-token", token }, (response) => resolve(!runtime.lastError && Boolean(response?.ok)));
    } catch {
      resolve(false);
    }
  });
}

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
    // The store release first, then a copy loaded from the repo (EXTENSION_IDS): the first that answers takes the key.
    let taken = false;
    if (runtime?.sendMessage) for (const id of EXTENSION_IDS) if ((taken = await offer(runtime, id, made))) break;
    setBusy(false);
    if (taken) return setMessage("Eklenti bağlandı. Eklentiyi açınca onaylı fişler gelir. Anahtar her kullanımda 30 gün uzar.");
    setToken(made);
    setMessage("Eklentiye ulaşılamadı: kurulu değil ya da eski sürüm. Chrome Web Store'dan kurun ya da anahtarı kopyalayıp eklentiye yapıştırın.");
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
      <p className="muted"><a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">Accountie Luca Doldurucu, Chrome Web Store</a></p>
      {/* Always mounted, so a screen reader hears the result when the text arrives. */}
      <p role="status" className="muted">{message}</p>
    </div>
  );
}
