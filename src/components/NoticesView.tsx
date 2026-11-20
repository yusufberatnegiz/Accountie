"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type NoticeRow = {
  id: string; firmName: string; institution: string; subUnit: string | null; docType: string | null; docNo: string | null;
  sentAt: string | null; servedAt: string | null; served: "past" | "today" | "future" | null; readOnGib: boolean; isNew: boolean;
};
export type FirmRead = { firmId: string; firmName: string; scannedAt: string | null; days: number | null; stale: boolean };

const readText = (r: FirmRead) => (r.scannedAt === null ? "Hiç okunmadı" : `${r.scannedAt} · ${r.days === 0 ? "bugün" : `${r.days} gün önce`}${r.stale ? ", yeniden okuyun" : ""}`);

/**
 * e-Tebligat: what the extension read from each firm's Dijital Vergi Dairesi list, new ones (not yet marked seen here) first, and
 * when each firm was last read. Accountie never opens an envelope; the document is read in GİB.
 */
export function NoticesView({ notices, firmReads, newCount, truncated }: { notices: NoticeRow[]; firmReads: FirmRead[]; newCount: number; truncated: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const fresh = notices.filter((n) => n.isNew);
  const read = firmReads.filter((r) => r.scannedAt !== null).length;
  const never = firmReads.length - read;
  const old = firmReads.filter((r) => r.scannedAt !== null && r.stale).length;

  async function seen(ids: string[]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaid(""); // a repeated sentence is read again only after the region was emptied
    const res = await fetch("/api/notices/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Kaydedilemedi. Tekrar deneyin.");
    setSaid(ids.length > 1 ? `${ids.length} tebligat görüldü olarak işaretlendi.` : "Tebligat görüldü olarak işaretlendi.");
    // The pressed button goes away with the refresh: focus goes to the heading, not to the top of the page.
    heading.current?.focus();
    router.refresh();
  }

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-firms">
      <div className="title-row">
        <div className="title-text">
          <h1 ref={heading} tabIndex={-1}>e-Tebligat</h1>
          <p className="finding">
            {read === 0 ? "Henüz hiçbir firma okunmadı." : <>
              {newCount ? `${newCount} yeni tebligat` : "Yeni tebligat yok"} · {read}/{firmReads.length} firma okundu
              {never ? <>, <strong className="finding-off">{never} hiç okunmadı</strong></> : null}
              {old ? <>, <strong className="finding-off">{old} firmanın son okuması 5 günden eski</strong></> : null}.
            </>}
          </p>
        </div>
        {fresh.length ? (
          <div className="title-actions">
            <button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => !busy && confirm(`${fresh.length} yeni tebligat görüldü olarak işaretlensin mi?`) && seen(fresh.map((n) => n.id))}>Hepsini gördüm</button>
          </div>
        ) : null}
      </div>

      <section className="panel firms-panel" aria-labelledby="tebligat-liste">
        <h2 id="tebligat-liste" className="visually-hidden">Tebligatlar</h2>
        <p className="visually-hidden" role="status">{said}</p>
        {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
        {truncated ? <p className="alert">Son {notices.length} tebligat gösteriliyor; daha eskileri Dijital Vergi Dairesi&apos;nde.</p> : null}
        <ul className="firms-list">
          {notices.map((n) => (
            <li key={n.id} className="firms-row notice-row" data-new={n.isNew || undefined}>
              <span className="firms-name">
                <span className="notice-type">{n.isNew ? <span className="notice-new">Yeni</span> : null}{n.docType ?? "Belge türü yok"}{n.docNo ? ` · No ${n.docNo}` : ""}</span>
                {n.firmName}
                <span className="firms-vkn">{[n.institution, n.subUnit].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="firms-month notice-dates">
                {n.servedAt ? <span className="notice-served">{n.served === "future" ? `Tebliğ edilmiş sayılacağı gün: ${n.servedAt}` : n.served === "today" ? `Bugün tebliğ edilmiş sayılır (${n.servedAt})` : `Tebliğ edildi: ${n.servedAt}`}</span> : null}
                {n.sentAt ? <span>Gönderim {n.sentAt}</span> : null}
                <span data-state={n.readOnGib ? undefined : "bekleyen"}>{n.readOnGib ? "GİB'de okunmuş" : "GİB'de okunmamış"}</span>
              </span>
              {n.isNew ? (
                <button type="button" className="btn btn-sm" aria-label={`${n.firmName}, ${n.docType ?? "tebligat"}: gördüm`} aria-disabled={busy || undefined} onClick={() => seen([n.id])}>Gördüm</button>
              ) : null}
            </li>
          ))}
          {notices.length === 0 ? <li className="firms-row"><span className="firms-name">{read ? "Okunan firmalarda tebligat yok." : "Henüz okuma yok. Nasıl okunur bölümündeki adımlarla ilk firmayı okuyun."}</span></li> : null}
        </ul>
      </section>

      <section className="panel firms-add" aria-labelledby="tebligat-nasil">
        <h2 id="tebligat-nasil">Nasıl okunur</h2>
        <p>Dijital Vergi Dairesi&apos;ne firmanın hesabıyla girin (ya da mali müşavir olarak <strong>Geçiş Yap</strong> ile firmaya geçin), sonra Accountie eklentisinde <strong>e-Tebligatları Accountie&apos;ye gönder</strong> düğmesine basın. Accountie şifre saklamaz, zarf açmaz: GİB&apos;de okundu kaydı düşmez, belgeyi GİB&apos;de siz açarsınız.</p>
        <p>Tebligat, e-Tebligat adresine ulaştığı günü izleyen 5. günün sonunda tebliğ edilmiş sayılır; süreler o günden başlar. Her firmayı en az 5 günde bir okuyun.</p>
        {firmReads.length ? (
          <>
            <h3 id="son-okuma">Firmaların son okuması</h3>
            <ul className="firms-list notice-scans" aria-labelledby="son-okuma">
              {firmReads.filter((r) => r.scannedAt !== null).map((r) => (
                <li key={r.firmId} className="firms-row">
                  <span className="firms-name">{r.firmName}</span>
                  <span className="firms-month" data-state={r.stale ? "bekleyen" : undefined}>{readText(r)}</span>
                </li>
              ))}
            </ul>
            {/* Hundreds of never-read firms would bury the reads: one line, opened on demand. */}
            {never ? (
              <details className="notice-never">
                <summary>Hiç okunmadı ({never} firma)</summary>
                <ul className="firms-list notice-scans">
                  {firmReads.filter((r) => r.scannedAt === null).map((r) => <li key={r.firmId} className="firms-row"><span className="firms-name">{r.firmName}</span></li>)}
                </ul>
              </details>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
