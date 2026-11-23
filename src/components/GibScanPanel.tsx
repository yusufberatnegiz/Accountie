"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { launchGibScan } from "@/lib/extension-bridge";

export type GibScanState = { enabled: boolean; stored: number; until: string | null; day: { reads: number; networks: number }; reads: { firmName: string; readAt: string }[] };

/**
 * The e-Tebligat scan's GİB logins: how many are stored (sealed), the user's approval that lets the extension unseal them for a few
 * hours, and the last unsealings. Approving needs a fresh sign-in (the server checks); ending it or deleting the logins does not.
 */
export function GibScanPanel({ state, account }: { state: GibScanState; account: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState("");

  async function act(url: string, method: "POST" | "DELETE", done: string | ((res: Response) => Promise<string>)) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaid("");
    try {
      const res = await fetch(url, { method }).catch(() => null);
      if (!res?.ok) return setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Yapılamadı. Tekrar deneyin.");
      setSaid(typeof done === "string" ? done : await done(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yapılamadı. Tekrar deneyin.");
    } finally {
      router.refresh();
      setBusy(false);
    }
  }

  const start = () => act("/api/gib-scan", "POST", async (res) => {
    const body = await res.json().catch(() => null) as { until?: string } | null;
    if (typeof body?.until === "string") {
      const result = await launchGibScan(account, body.until);
      if (result === "started") return "e-Tebligat tarama sekmesi açıldı.";
      if (result === "manual") return "Tarama erişimi açıldı. Eklentiden e-Tebligat taramasını başlatabilirsiniz.";
      await fetch(`/api/gib-scan?until=${encodeURIComponent(body.until)}`, { method: "DELETE" }).catch(() => null);
    }
    throw new Error("Tarama sekmesi açılamadı. Güncel Accountie eklentisinin etkin ve bu hesaba bağlı olduğunu kontrol edin.");
  });

  if (!state.enabled) return null;
  return (
    <section className="panel firms-add" aria-labelledby="gib-giris">
      <h2 id="gib-giris">GİB girişleri</h2>
      {state.stored ? (
        <>
          <p>{state.stored} firmanın Dijital Vergi Dairesi girişi şifreli olarak saklanıyor. Taramayı başlattığınızda eklenti, bu bilgisayardan firma firma erişim alır. Erişim en çok 4 saat sürer ve tarama bitince kapanır.</p>
          <p className="finding">{state.until ? `Tarama erişimi ${state.until} tarihine kadar açık. ` : ""}Son 24 saatte {state.day.reads} şifre açıldı{state.day.networks > 1 ? `, ${state.day.networks} farklı ağdan` : ""}.</p>
          <p>Burada sizin açmadığınız bir giriş görürseniz hemen Kayıtlı girişleri sil&apos;e basın, Accountie şifrenizi değiştirin ve eklentiyi yeniden bağlayın.</p>
          <div className="title-actions">
            {state.until
              ? <button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => act("/api/gib-scan", "DELETE", "Tarama erişimi kapatıldı.")}>Tarama erişimini kapat</button>
              : <button type="button" className="btn btn-primary" aria-disabled={busy || undefined} onClick={start}>Taramayı başlat</button>}
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
      <p className={said ? "finding" : "visually-hidden"} role="status">{said}</p>
    </section>
  );
}
