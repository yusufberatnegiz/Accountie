"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Firm } from "@/db/queries";

const tr = (s: string) => s.toLocaleLowerCase("tr");

/**
 * The mükellef list: a müşavir keeps hundreds, so it is searched, not scrolled. Choosing a firm makes it the panel's firm
 * (uploads, the list and the Luca file follow it) and goes back to its receipts.
 */
export function FirmsView({ firms, activeId, base = "/panel" }: { firms: Firm[]; activeId: string; base?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const q = tr(query.trim());
  // The open firm leads the list, so it is never hundreds of rows down; a search keeps name order.
  const ordered = [...firms.filter((f) => f.id === activeId), ...firms.filter((f) => f.id !== activeId)];
  const shown = q ? firms.filter((f) => tr(f.name).includes(q) || f.taxNumber?.includes(q)) : ordered;

  async function send(url: string, body: unknown, key: string) {
    setBusy(key);
    setError("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) {
      setBusy(null);
      setError((await res?.json().catch(() => null))?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.");
      return;
    }
    router.push(base);
    router.refresh();
  }

  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const taxNumber = String(data.get("vkn") ?? "").trim();
    send("/api/firms", { name: String(data.get("ad") ?? "").trim(), ...(taxNumber ? { taxNumber } : {}) }, "yeni");
  }

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-firms">
      <div className="title-row">
        <div className="title-text">
          <h1>Firmalar</h1>
          <p className="finding">{firms.length} firma. Seçtiğiniz firmanın fişleri listelenir; yüklenen fişler ve Luca dosyası o firmaya aittir.</p>
        </div>
      </div>
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}

      <section className="panel firms-panel" aria-labelledby="firma-liste">
        <h2 id="firma-liste" className="visually-hidden">Firma listesi</h2>
        <label className="firms-search">
          <span className="visually-hidden">Firma ara</span>
          <input className="field" type="search" placeholder="Firma adı ya da VKN ile ara" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </label>
        <ul className="firms-list">
          {shown.map((f) => (
            <li key={f.id} className="firms-row" data-active={f.id === activeId || undefined}>
              <span className="firms-name">{f.name}{f.taxNumber ? <span className="firms-vkn">VKN {f.taxNumber}</span> : null}</span>
              {f.id === activeId ? <span className="status">Seçili</span> : (
                <button type="button" className="btn btn-sm" disabled={busy !== null} onClick={() => send("/api/firms/active", { id: f.id }, f.id)}>
                  {busy === f.id ? "Açılıyor…" : "Seç"}
                </button>
              )}
            </li>
          ))}
          {shown.length === 0 ? <li className="firms-row"><span className="firms-name">“{query.trim()}” ile eşleşen firma yok.</span></li> : null}
        </ul>
      </section>

      <section className="panel firms-add" aria-labelledby="firma-ekle">
        <h2 id="firma-ekle">Firma ekle</h2>
        <form className="firms-form" onSubmit={add}>
          <label className="stack"><span>Firma adı</span><input className="field" name="ad" required minLength={2} maxLength={120} autoComplete="off" /></label>
          <label className="stack"><span>VKN ya da TCKN (isteğe bağlı)</span><input className="field tnum" name="vkn" inputMode="numeric" pattern="\d{10,11}" maxLength={11} autoComplete="off" /></label>
          <button type="submit" className="btn btn-primary" disabled={busy !== null}>{busy === "yeni" ? "Ekleniyor…" : "Ekle ve seç"}</button>
        </form>
      </section>
    </main>
  );
}
