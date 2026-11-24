"use client";

import { useRouter } from "next/navigation";
import { addTransitionType, startTransition, useEffect, useRef, useState } from "react";
import { Roll } from "@/components/home/Odometer";
import { MoveTransition } from "@/components/MoveTransition";
import { byFirm } from "@/lib/notices";

export type NoticeRow = {
  id: string; firmId: string; firmName: string; institution: string; subUnit: string | null; docType: string | null; docNo: string | null;
  sentAt: string | null; servedAt: string | null; served: "past" | "today" | "future" | null; readOnGib: boolean; isNew: boolean;
  /** First found today (Turkey): listed under Bugün. */
  today: boolean;
};
export type FirmRead = { firmId: string; firmName: string; scannedAt: string | null; days: number | null; stale: boolean };

const readText = (r: FirmRead) => (r.scannedAt === null ? "Hiç okunmadı" : `${r.scannedAt} · ${r.days === 0 ? "bugün" : `${r.days} gün önce`}${r.stale ? ", yeniden okuyun" : ""}`);

/**
 * An opened drawer's notices drop in 8px (line-in's values). Started from the toggle, not CSS on [open]: a drawer moved by a
 * refresh would replay a CSS animation, the toggle event does not fire for it.
 */
function dropIn(e: React.SyntheticEvent<HTMLDetailsElement>) {
  const d = e.currentTarget;
  if (!d.open || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  d.lastElementChild?.animate([{ opacity: 0, transform: "translateY(-8px)" }, {}], { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
}

/**
 * e-Tebligat: what the extension read from each firm's Dijital Vergi Dairesi list, under Bugün (found today) and Daha önce, one
 * closed drawer per firm with its new count, and when each firm was last read. Seen notices leave after a week. Accountie never
 * opens an envelope; the document is read in GİB.
 */
export function NoticesView({ notices, firmReads, newCount, truncated, scanCompleted, children }: { notices: NoticeRow[]; firmReads: FirmRead[]; newCount: number; truncated: boolean; scanCompleted?: boolean; children?: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  // The drawer whose "Gördüm" was pressed: after the refresh focus goes back to it, not to the top of hundreds of firms.
  const back = useRef<{ drawer: string; firmName: string } | null>(null);
  // Said only after focus has moved there: a screen reader cuts a sentence that a focus change interrupts.
  const pending = useRef("");
  const fresh = notices.filter((n) => n.isNew);
  const read = firmReads.filter((r) => r.scannedAt !== null).length;
  const never = firmReads.length - read;
  const old = firmReads.filter((r) => r.scannedAt !== null && r.stale).length;
  const days = [
    { key: "bugun", title: "Bugün bulunanlar", firms: byFirm(notices.filter((n) => n.today)) },
    { key: "once", title: "Daha önce bulunanlar", firms: byFirm(notices.filter((n) => !n.today)) },
  ].filter((d) => d.firms.length);

  useEffect(() => {
    if (!back.current) return;
    const { drawer: key, firmName } = back.current;
    const drawer = document.querySelector<HTMLElement>(`[data-drawer="${key}"]`);
    back.current = null;
    // A drawer with no new notice left moves down among the done ones: focus goes to the next new drawer (that day's first, else
    // any) instead of scrolling after it, since the müşavir works from the top. The sentence says why focus is elsewhere.
    const done = !!drawer && !drawer.hasAttribute("data-new");
    const next = done ? (drawer.closest(".notice-day")?.querySelector<HTMLElement>("details[data-new] > summary") ?? document.querySelector<HTMLElement>("details[data-new] > summary")) : null;
    (next ?? drawer?.querySelector<HTMLElement>(":scope > summary") ?? heading.current)?.focus();
    setSaid(next ? `${pending.current} ${firmName} firmasında yeni tebligat kalmadı.` : pending.current);
    pending.current = "";
  }, [notices]);

  // A scan finishes in the extension's tab: coming back to this tab shows what it found, without a reload.
  useEffect(() => {
    let last = 0;
    let later: ReturnType<typeof setTimeout> | undefined;
    // At most every 20 s: switching tabs back and forth during a scan does not re-render the page each time. A return inside the
    // 20 s is refreshed when they end, not dropped.
    const back = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(later);
      const wait = 20_000 - (Date.now() - last);
      if (wait > 0) { later = setTimeout(back, wait); return; }
      last = Date.now();
      startTransition(() => { addTransitionType("tebligat"); router.refresh(); });
    };
    document.addEventListener("visibilitychange", back);
    return () => { clearTimeout(later); document.removeEventListener("visibilitychange", back); };
  }, [router]);

  // New drawers rise in, a drawer that changes place slides there (MoveTransition below); the page itself does not fade.
  function refresh() {
    startTransition(() => { addTransitionType("tebligat"); router.refresh(); });
  }

  async function seen(ids: string[], drawer: { drawer: string; firmName: string } | null = null) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaid(""); // a repeated sentence is read again only after the region was emptied
    const res = await fetch("/api/notices/seen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Kaydedilemedi. Tekrar deneyin.");
    const sentence = ids.length > 1 ? `${ids.length} tebligat görüldü olarak işaretlendi.` : "Tebligat görüldü olarak işaretlendi.";
    // The pressed button goes away with the refresh: focus goes to its drawer (found again after the refresh), else the heading.
    back.current = drawer;
    if (drawer) pending.current = sentence;
    else { heading.current?.focus(); setSaid(sentence); }
    refresh();
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
        <div className="title-actions">
          {/* The scan panel sits beside the list but after every drawer in tab order: one step to it. */}
          <a className="btn btn-primary" href="https://dijital.gib.gov.tr/" target="_blank" rel="noopener noreferrer">Dijital Vergi Dairesi’ni aç</a>
          <a className="btn notice-jump" href="#tebligat-ayarlar">Tarama ve ayarlar</a>
          {fresh.length ? (
            <button type="button" className="btn" aria-disabled={busy || undefined} onClick={() => !busy && confirm(`${fresh.length} yeni tebligat görüldü olarak işaretlensin mi?`) && seen(fresh.map((n) => n.id))}>Hepsini gördüm</button>
          ) : null}
        </div>
      </div>

      <section className="panel firms-panel" aria-labelledby="tebligat-liste">
        <h2 id="tebligat-liste" className="visually-hidden">Tebligatlar</h2>
        <p className="visually-hidden" role="status">{said}</p>
        {scanCompleted ? <p className="alert alert-ok" role="status">Tarama tamamlandı.</p> : null}
        {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
        {truncated ? <p className="alert">{newCount > fresh.length ? `Liste ${notices.length} tebligatla sınırlı; ${newCount - fresh.length} yeni tebligat burada görünmüyor. Gösterilenleri Gördüm diye işaretledikçe sıradakiler gelir.` : `Liste ${notices.length} tebligatla sınırlı; daha eskileri Dijital Vergi Dairesi'nde.`}</p> : null}
        {days.map((d) => (
          <section key={d.key} className="notice-day" aria-labelledby={`gun-${d.key}`}>
            <h3 id={`gun-${d.key}`} className="notice-day-title">{d.title}</h3>
            {d.firms.map((g) => (
              <MoveTransition key={g.firmId} enter={{ tebligat: "row-rise", default: "none" }} update={{ tebligat: "row-move", default: "none" }} exit="none" default="none">
              <details className="notice-firm" data-drawer={`${d.key}-${g.firmId}`} data-new={g.fresh ? true : undefined} onToggle={dropIn}>
                <summary>
                  <span className="notice-firm-name">{g.firmName}<span className="visually-hidden">, </span></span>
                  <span className="notice-firm-count"><Roll value={g.fresh ? `${g.fresh} yeni tebligat` : `${g.rows.length} tebligat`} /></span>
                </summary>
                <ul className="firms-list">
                  {g.rows.map((n) => (
            <li key={n.id} className="firms-row notice-row" data-new={n.isNew || undefined}>
              <span className="firms-name">
                <span className="notice-type">{n.isNew ? <span className="notice-new">Yeni</span> : null}{n.docType ?? "Belge türü yok"}{n.docNo ? ` · No ${n.docNo}` : ""}</span>
                <span className="firms-vkn">{[n.institution, n.subUnit].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="firms-month notice-dates">
                {n.servedAt ? <span className="notice-served">{n.served === "future" ? `Tebliğ edilmiş sayılacağı gün: ${n.servedAt}` : n.served === "today" ? `Bugün tebliğ edilmiş sayılır (${n.servedAt})` : n.served === "past" ? `Tebliğ edildi: ${n.servedAt}` : `Tebliğ: ${n.servedAt}`}</span> : null}
                {n.sentAt ? <span>Gönderim {n.sentAt}</span> : null}
                <span data-state={n.readOnGib ? undefined : "bekleyen"}>{n.readOnGib ? "GİB'de okunmuş" : "GİB'de okunmamış"}</span>
              </span>
              {n.isNew ? (
                <button type="button" className="btn btn-sm" aria-label={`${n.firmName}, ${n.docType ?? "tebligat"}: gördüm`} aria-disabled={busy || undefined} onClick={() => seen([n.id], { drawer: `${d.key}-${g.firmId}`, firmName: g.firmName })}>Gördüm</button>
              ) : null}
            </li>
                  ))}
                </ul>
              </details>
              </MoveTransition>
            ))}
          </section>
        ))}
        {notices.length === 0 ? <p className="notice-empty">{read ? "Yeni tebligat yok; görülen tebligatlar bir hafta sonra listeden kalkar." : "Henüz okuma yok. Nasıl okunur bölümündeki adımlarla ilk firmayı okuyun."}</p> : null}
      </section>

      <aside id="tebligat-ayarlar" tabIndex={-1} className="notice-sidebar" aria-label="e-Tebligat ayarları ve açıklamaları">
        {children}

        <section className="panel firms-add" aria-labelledby="tebligat-nasil">
          <h2 id="tebligat-nasil">Nasıl okunur</h2>
          <p>Bütün firmalar için eklentide <strong>e-Tebligat taraması → Taramayı başlat</strong> seçeneğini kullanabilirsiniz. Tek firma için Dijital Vergi Dairesi&apos;ne firmanın hesabıyla girip eklentide <strong>Tebligatları getir</strong>&apos;e basın. Tek firma işlemi yalnızca listeyi okur.</p>
          <p>Tebligat, e-Tebligat adresine ulaştığı günü izleyen 5. günün sonunda tebliğ edilmiş sayılır; süreler o günden başlar. Her firmayı en az 5 günde bir okuyun.</p>
          <p>Bugün bulunanlar en üstte. Gördüm dediğiniz tebligatlar bir hafta sonra bu listeden kalkar; hepsi Dijital Vergi Dairesi&apos;nde durur.</p>
          {firmReads.length ? (
            <>
              {read ? (
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
                </>
              ) : null}
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
      </aside>
    </main>
  );
}
