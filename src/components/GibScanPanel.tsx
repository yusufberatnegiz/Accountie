"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { launchGibScan } from "@/lib/extension-bridge";

export type GibScanState = {
  enabled: boolean; stored: number; until: string | null; day: { reads: number; networks: number }; reads: { firmName: string; readAt: string }[];
  /** Firms with a stored login, for "Firma seçerek tara". */
  firms: { lucaId: string; name: string; taxNumber: string }[];
};

const tr = (s: string) => s.toLocaleLowerCase("tr");

/**
 * The e-Tebligat scan's GİB logins: how many are stored (sealed), the user's approval that lets the extension unseal them for a few
 * hours, and the last unsealings. The server verifies the current Accountie session when approving access.
 */
export function GibScanPanel({ state, account, approvalOnly = false }: { state: GibScanState; account: string; approvalOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const shown = useMemo(() => {
    const q = tr(query.trim());
    return q ? state.firms.filter((f) => tr(f.name).includes(q) || f.taxNumber.includes(q)) : state.firms;
  }, [query, state.firms]);
  const picker = useRef<HTMLDialogElement>(null);
  const toggle = (id: string) => setChosen((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function act(url: string, method: "POST" | "DELETE", done: string | ((res: Response) => Promise<string>), body?: unknown) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaid("");
    try {
      const res = await fetch(url, body === undefined ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
      if (!res?.ok) return setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Yapılamadı. Tekrar deneyin.");
      setSaid(typeof done === "string" ? done : await done(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yapılamadı. Tekrar deneyin.");
    } finally {
      router.refresh();
      setBusy(false);
    }
  }

  // lucaIds: only these firms (the approval opens only their logins and the extension is given only them); none: every firm.
  const start = (lucaIds?: string[]) => act("/api/gib-scan", "POST", async (res) => {
    const body = await res.json().catch(() => null) as { until?: string } | null;
    if (typeof body?.until === "string") {
      const result = await launchGibScan(account, body.until);
      const which = lucaIds ? `${lucaIds.length} firma için ` : "";
      if (result === "started") return `${which}e-Tebligat tarama sekmesi açıldı.`;
      if (result === "manual") return `${which}Tarama erişimi açıldı. Eklentiden e-Tebligat taramasını başlatabilirsiniz.`;
      await fetch(`/api/gib-scan?until=${encodeURIComponent(body.until)}`, { method: "DELETE" }).catch(() => null);
    }
    throw new Error("Tarama sekmesi açılamadı. Güncel Accountie eklentisinin etkin ve bu hesaba bağlı olduğunu kontrol edin.");
  }, lucaIds ? { lucaIds } : undefined);

  if (!state.enabled && !approvalOnly) return null;
  return (
    <section className={approvalOnly ? "panel account-body" : "panel firms-add"} aria-labelledby="gib-giris">
      <h2 id="gib-giris">GİB girişleri</h2>
      {!state.enabled ? <p>GİB girişlerini saklama Accountie&apos;de etkin değil.</p> : state.stored ? (
        <>
          <p>{state.stored} firmanın Dijital Vergi Dairesi girişi şifreli olarak saklanıyor. Taramayı başlattığınızda eklenti, bu bilgisayardan firma firma erişim alır. Erişim en çok 4 saat sürer ve tarama bitince kapanır.</p>
          {approvalOnly ? <p>Erişimi onayladıktan sonra açık eklenti sekmesine dönüp <strong>Taramayı başlat</strong>&apos;a basın. GİB doğrulama kodu isterse elle girin.</p> : null}
          <p className="finding">{state.until ? `Tarama erişimi ${state.until} tarihine kadar açık. ` : ""}Son 24 saatte {state.day.reads} şifre açıldı{state.day.networks > 1 ? `, ${state.day.networks} farklı ağdan` : ""}.</p>
          <p>Burada sizin açmadığınız bir giriş görürseniz hemen Kayıtlı girişleri sil&apos;e basın, Accountie şifrenizi değiştirin ve eklentiyi yeniden bağlayın.</p>
          <div className="title-actions">
            {state.until
              ? <button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => act("/api/gib-scan", "DELETE", "Tarama erişimi kapatıldı.")}>Tarama erişimini kapat</button>
              : approvalOnly
                ? <button type="button" className="btn btn-primary" aria-disabled={busy || undefined} onClick={() => act("/api/gib-scan", "POST", "Tarama erişimi açıldı. Eklenti sekmesine dönün.")}>Tarama erişimini onayla</button>
                : <button type="button" className="btn btn-primary" aria-disabled={busy || undefined} onClick={() => start()}>Tüm firmaları tara</button>}
            <button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => confirm(`${state.stored} firmanın kayıtlı GİB girişi silinsin mi? Yeniden taramak için firmaları Luca'dan yeniden çekmeniz gerekir.`) && act("/api/gib-logins", "DELETE", "Kayıtlı GİB girişleri silindi.")}>Kayıtlı girişleri sil</button>
          </div>
          {!approvalOnly && !state.until && state.firms.length > 1 ? (
            <>
              <button type="button" className="btn" aria-haspopup="dialog" onClick={() => picker.current?.showModal()}>
                Firma seçerek tara{chosen.size ? ` (${chosen.size} seçili)` : ""}
              </button>
              {/* Covers the page: hundreds of firms need the whole window. A native <dialog>: Escape, focus trap, focus back. */}
              <dialog ref={picker} className="scan-picker" aria-labelledby="secerek-tara">
                <div className="scan-picker-head">
                  <p id="secerek-tara" className="account-title">Taranacak firmaları seçin</p>
                  <button className="btn btn-quiet btn-sm" type="button" onClick={() => picker.current?.close()}>Kapat</button>
                </div>
                <div className="scan-picker-tools">
                  <label className="firms-search">
                    <span className="visually-hidden">Taranacak firmayı ara</span>
                    <input className="field" type="search" placeholder="Firma adı ya da VKN ile ara" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
                  </label>
                  <button type="button" className="btn btn-sm" disabled={!shown.length} onClick={() => setChosen((c) => new Set([...c, ...shown.map((f) => f.lucaId)]))}>
                    {query.trim() ? `Bulunanları seç (${shown.length})` : `Hepsini seç (${state.firms.length})`}
                  </button>
                  <button type="button" className="btn btn-sm" disabled={!chosen.size} onClick={() => setChosen(new Set())}>Seçimi temizle</button>
                </div>
                <p className="visually-hidden" role="status">{query.trim() ? `${shown.length} firma bulundu.` : ""}</p>
                <ul className="scan-picker-list" aria-label="Taranacak firmalar">
                  {shown.map((f) => (
                    <li key={f.lucaId}>
                      <label className="scan-pick-row" data-on={chosen.has(f.lucaId) || undefined}>
                        <input type="checkbox" className="row-check" checked={chosen.has(f.lucaId)} onChange={() => toggle(f.lucaId)} />
                        <span className="firms-name">{f.name}<span className="firms-vkn">VKN {f.taxNumber}</span></span>
                      </label>
                    </li>
                  ))}
                  {shown.length ? null : <li className="scan-picker-empty">Bu aramayla firma yok.</li>}
                </ul>
                <div className="scan-picker-foot">
                  <span className="finding">{chosen.size} / {state.firms.length} firma seçili</span>
                  <button type="button" className="btn btn-primary" aria-disabled={busy || !chosen.size || undefined}
                    onClick={() => { if (busy || !chosen.size) return; picker.current?.close(); start(state.firms.filter((f) => chosen.has(f.lucaId)).map((f) => f.lucaId)); }}>
                    {chosen.size ? `Seçilen ${chosen.size} firmayı tara` : "Taramak için firma seçin"}
                  </button>
                </div>
              </dialog>
            </>
          ) : null}
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
      <p className={said ? "finding" : "visually-hidden"} role="status">{said}</p>
    </section>
  );
}
