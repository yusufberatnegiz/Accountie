"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type GibScanState = { enabled: boolean; stored: number; until: string | null; day: { reads: number; networks: number }; reads: { firmName: string; readAt: string }[] };

/**
 * The e-Tebligat scan's GİB logins: how many are stored (sealed), the user's approval that lets the extension unseal them for a few
 * hours, and the last unsealings. Approving needs a fresh sign-in (the server checks); ending it or deleting the logins does not.
 */
export function GibScanPanel({ state }: { state: GibScanState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState("");

  async function act(url: string, method: "POST" | "DELETE", done: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaid("");
    const res = await fetch(url, { method }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Yapılamadı. Tekrar deneyin.");
    setSaid(done);
    router.refresh();
  }

  if (!state.enabled) return null;
  return (
    <section className="panel firms-add" aria-labelledby="gib-giris">
      <h2 id="gib-giris">GİB girişleri</h2>
      {state.stored ? (
        <>
          <p>{state.stored} firmanın Dijital Vergi Dairesi girişi şifreli olarak saklanıyor; firmalar Luca&apos;dan çekilirken bir kez okundu. Eklenti bir şifreyi yalnız siz bu bilgisayardan taramayı onayladıktan sonraki 4 saat içinde, firma firma açabilir; tarama bitince onay kendiliğinden kapanır. Her açılış aşağıda kayıtlıdır.</p>
          <p className="finding">{state.until ? `Tarama ${state.until} saatine kadar onaylı.` : "Tarama onaylı değil."} · Son 24 saatte {state.day.reads} şifre açıldı{state.day.networks > 1 ? `, ${state.day.networks} farklı ağdan` : ""}.</p>
          <p>Burada sizin açmadığınız bir giriş görürseniz hemen Kayıtlı girişleri sil&apos;e basın, Accountie şifrenizi değiştirin ve eklentiyi yeniden bağlayın.</p>
          <div className="title-actions">
            {state.until
              ? <button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => act("/api/gib-scan", "DELETE", "Tarama onayı bitirildi.")}>Onayı bitir</button>
              : <button type="button" className="btn btn-primary" aria-disabled={busy || undefined} onClick={() => act("/api/gib-scan", "POST", "Tarama 4 saat için onaylandı. Eklentide Taramayı başlat'a basın.")}>Taramayı onayla (4 saat)</button>}
            <button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => confirm(`${state.stored} firmanın kayıtlı GİB girişi silinsin mi? Yeniden taramak için firmaları Luca'dan yeniden çekmeniz gerekir.`) && act("/api/gib-logins", "DELETE", "Kayıtlı GİB girişleri silindi.")}>Kayıtlı girişleri sil</button>
          </div>
          {state.reads.length ? (
            <details className="notice-never">
              <summary>Son açılan girişler ({state.reads.length})</summary>
              <ul className="firms-list notice-scans">
                {state.reads.map((r, i) => <li key={i} className="firms-row"><span className="firms-name">{r.firmName}</span><span className="firms-month">{r.readAt}</span></li>)}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <p>Kayıtlı GİB girişi yok. Luca&apos;da <strong>GİB Şirket</strong> ekranının bilgileri, eklentiyle firmalar Luca&apos;dan çekilirken bir kez okunup şifreli saklanır.</p>
      )}
      {error ? <p className="error" role="alert">{error}</p> : null}
      <p className="visually-hidden" role="status">{said}</p>
    </section>
  );
}
