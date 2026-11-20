"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type NoticeRow = {
  id: string; firmName: string; institution: string; subUnit: string | null; docType: string | null; docNo: string | null;
  sentAt: string | null; servedAt: string | null; readOnGib: boolean; isNew: boolean;
};
export type ScanRow = { firmId: string; firmName: string; scannedAt: string; stale: boolean };

/**
 * e-Tebligat: what the extension read from each firm's Dijital Vergi Dairesi list. New ones (not yet marked seen here) first.
 * Accountie never opens an envelope; the document is read in GİB.
 */
export function NoticesView({ notices, scans }: { notices: NoticeRow[]; scans: ScanRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fresh = notices.filter((n) => n.isNew);
  const stale = scans.filter((s) => s.stale).length;

  async function seen(ids: string[] | null) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/notices/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Kaydedilemedi. Tekrar deneyin.");
    router.refresh();
  }

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-firms">
      <div className="title-row">
        <div className="title-text">
          <h1>e-Tebligat</h1>
          <p className="finding">
            {scans.length === 0 ? "Henüz hiçbir firmanın e-Tebligat listesi okunmadı."
              : `${fresh.length ? `${fresh.length} yeni tebligat` : "Yeni tebligat yok"} · ${scans.length} firma okundu${stale ? `, ${stale} firmanın son okuması 5 günden eski` : ""}.`}
          </p>
        </div>
        {fresh.length ? <div className="title-actions"><button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => seen(null)}>Hepsini gördüm</button></div> : null}
      </div>

      <section className="panel firms-panel" aria-labelledby="tebligat-liste">
        <h2 id="tebligat-liste" className="visually-hidden">Tebligatlar</h2>
        {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
        <ul className="firms-list">
          {notices.map((n) => (
            <li key={n.id} className="firms-row notice-row" data-active={n.isNew || undefined}>
              <span className="firms-name">
                {n.firmName}
                <span className="firms-vkn">{[n.institution, n.subUnit].filter(Boolean).join(" · ")}</span>
                <span className="firms-vkn">{[n.docType, n.docNo && `No ${n.docNo}`].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="firms-month notice-dates">
                {n.sentAt ? <span>Gönderim {n.sentAt}</span> : null}
                {n.servedAt ? <span>Tebliğ {n.servedAt}</span> : null}
                <span data-state={n.readOnGib ? undefined : "bekleyen"}>{n.readOnGib ? "GİB'de açılmış" : "GİB'de açılmamış"}</span>
              </span>
              {n.isNew ? (
                <button type="button" className="btn btn-sm" aria-label={`${n.firmName} tebligatını gördüm`} aria-disabled={busy || undefined} onClick={() => seen([n.id])}>Gördüm</button>
              ) : null}
            </li>
          ))}
          {notices.length === 0 ? <li className="firms-row"><span className="firms-name">{scans.length ? "Okunan firmalarda tebligat yok." : "Tebligat listesi boş."}</span></li> : null}
        </ul>
      </section>

      <section className="panel firms-add" aria-labelledby="tebligat-nasil">
        <h2 id="tebligat-nasil">Nasıl okunur</h2>
        <p>Dijital Vergi Dairesi&apos;ne firmanın hesabıyla girin (ya da mali müşavir olarak <strong>Geçiş Yap</strong> ile firmaya geçin), sonra Accountie eklentisinde <strong>e-Tebligatları Accountie&apos;ye gönder</strong>&apos;e basın. Accountie şifre saklamaz, zarf açmaz: GİB&apos;de okundu kaydı düşmez, belgeyi GİB&apos;de siz açarsınız.</p>
        <p>Tebliğ, tebligatın gönderildiği günü izleyen 5. gün kendiliğinden yapılmış sayılır; her firmayı 5 günde bir okuyun.</p>
        {scans.length ? (
          <ul className="firms-list notice-scans" aria-label="Son okuma">
            {scans.map((s) => (
              <li key={s.firmId} className="firms-row">
                <span className="firms-name">{s.firmName}</span>
                <span className="firms-month" data-state={s.stale ? "bekleyen" : undefined}>{s.scannedAt}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
