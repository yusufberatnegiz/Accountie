"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, startTransition, useContext, useRef, useState, type ReactNode } from "react";

type Status = "draft" | "approved" | "exported";
type Busy = "approve" | "reopen" | "delete" | null;
type Ctx = {
  chosen: ReadonlySet<string>; toggle: (id: string) => void; setAll: (on: boolean) => void; statuses: Record<string, Status>;
  busy: Busy; setBusy: (b: Busy) => void; message: string; setMessage: (m: string) => void;
};
const Selection = createContext<Ctx | null>(null);

/**
 * Receipts picked on the list (its checkboxes), and what can be done to them at once: the drafts approved or deleted, the approved ones
 * taken back to draft. `statuses`: every row the list shows, so the bar can say how many of the picked ones each step reaches.
 */
export function ListSelection({ statuses, children }: { statuses: Record<string, Status>; children: ReactNode }) {
  // Each tick keeps the status it was ticked in: a row approved meanwhile (opened, Ctrl+Enter) drops out instead of moving to "taslağa al".
  const [chosen, setChosen] = useState<ReadonlyMap<string, Status>>(new Map());
  // While a step runs the ticks hold still (a tick made then would be wiped when it ends); the last result goes at the next tick.
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState("");
  const toggle = (id: string) => { setMessage(""); setChosen((s) => { const n = new Map(s); if (!n.delete(id)) n.set(id, statuses[id]); return n; }); };
  const setAll = (on: boolean) => { if (on) setMessage(""); setChosen(on ? new Map(Object.entries(statuses)) : new Map()); };
  // A row that left the list (deleted, another tab or month) or changed status is never acted on unseen.
  const shown = new Set([...chosen].filter(([id, st]) => statuses[id] === st).map(([id]) => id));
  return (
    <Selection.Provider value={{ chosen: shown, toggle, setAll, statuses, busy, setBusy, message, setMessage }}>
      {/* Over the checkbox column, so "Tümünü seç" lines up with the row ticks (the table's head is hidden on the phone). */}
      <div className="select-toggle"><AllCheck /></div>
      {children}
      <SelectionBar />
    </Selection.Provider>
  );
}

export function RowCheck({ id, label }: { id: string; label: string }) {
  const s = useContext(Selection);
  if (!s) return null;
  // The label is the 44px touch area around the 20px box, over the row link, so a thumb slightly off never opens the receipt.
  return <label className="row-check-hit"><input type="checkbox" className="row-check" checked={s.chosen.has(id)} disabled={!!s.busy} onChange={() => s.toggle(id)} aria-label={`${label} seç`} /></label>;
}

function AllCheck() {
  const s = useContext(Selection)!;
  const n = Object.keys(s.statuses).length;
  const all = n > 0 && s.chosen.size === n;
  return (
    <label className="select-all">
      <input type="checkbox" className="row-check" checked={all} disabled={!n || !!s.busy} ref={(el) => { if (el) el.indeterminate = s.chosen.size > 0 && !all; }}
        onChange={() => s.setAll(!all)} />
      <span>Tümünü seç <span className="tnum">({n})</span></span>
    </label>
  );
}

function SelectionBar() {
  const s = useContext(Selection)!;
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const { busy, setBusy, message, setMessage } = s;
  const status = useRef<HTMLParagraphElement>(null);
  const ids = [...s.chosen];
  const drafts = ids.filter((id) => s.statuses[id] === "draft");
  const approved = ids.filter((id) => s.statuses[id] === "approved");
  const others = ids.length - drafts.length - approved.length;
  // The receipt open under its row, with edits not yet saved: approving it would send its saved lines, deleting it loses the edits.
  const open = params.get("fis");
  const dirtyOpen = () => !!open && drafts.includes(open) && "unsaved" in document.documentElement.dataset;
  const done = (text: string) => { setMessage(text); s.setAll(false); setBusy(null); status.current?.focus(); startTransition(() => router.refresh()); };

  async function approve() {
    const held = dirtyOpen();
    const ids = held ? drafts.filter((id) => id !== open) : drafts;
    const heldNote = " Açık fişin kaydedilmemiş değişiklikleri var; o fiş onaylanmaz, kendi Onayla düğmesiyle onaylayın.";
    if (!ids.length) { setMessage(heldNote.trim()); return; }
    if (!confirm(`${held ? `Seçilen ${drafts.length} taslaktan ${ids.length} tanesi` : `Seçilen ${ids.length} taslak`} onaylansın mı? Uyarısı olan fişler de onaylanır; araç türü seçilmemiş, mali değeri olmayan ya da satırları tutmayan fişler taslak kalır.${held ? heldNote : ""}`)) return;
    setBusy("approve");
    const res = await fetch("/api/receipts/bulk-approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids, selected: true }) }).catch(() => null);
    const body = res?.ok ? ((await res.json()) as { approved: number; skipped: number; stopped?: boolean }) : null;
    done(!body ? "Fişler onaylanamadı. Tekrar deneyin." : `${body.approved} fiş onaylandı.${body.stopped ? " Kalanlar bir hata yüzünden onaylanamadı; tekrar deneyin." : body.skipped ? ` ${body.skipped} fiş taslak kaldı; açıp eksiğini tamamlayın.` : ""}${held ? heldNote : ""}`);
  }

  async function reopen() {
    if (!confirm(`Seçilen ${approved.length} onaylı fiş taslağa alınsın mı? Eklentide ve Luca dosyasında görünmezler; yeniden onaylanana kadar beklerler.`)) return;
    setBusy("reopen");
    let n = 0;
    // shortcut: one request per receipt, in order (a list holds at most 200); a bulk route if lists grow.
    for (const id of approved) if ((await fetch(`/api/receipts/${id}/reopen`, { method: "POST" }).catch(() => null))?.ok) n++;
    done(`${n} fiş taslağa alındı.${n < approved.length ? ` ${approved.length - n} fiş alınamadı; listeyi yenileyip tekrar deneyin.` : ""}`);
  }

  async function remove() {
    if (!confirm(`Seçilen ${drafts.length} taslak silinsin mi? Silinen fiş geri getirilemez.${drafts.length < ids.length ? " Onaylı ve aktarılmış fişler silinmez." : ""}${dirtyOpen() ? " Açık fişteki kaydedilmemiş değişiklikler de kaybolur." : ""}`)) return;
    setBusy("delete");
    const res = await fetch("/api/receipts/bulk-delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: drafts }) }).catch(() => null);
    const body = res?.ok ? ((await res.json()) as { deleted: number; skipped: number }) : null;
    // The open receipt deleted: its address goes too, so Back or a reload never points at a receipt that is gone.
    if (body && open && drafts.includes(open)) {
      const q = new URLSearchParams(params);
      q.delete("fis");
      router.replace(q.size ? `${path}?${q}` : path, { scroll: false });
    }
    done(!body ? "Fişler silinemedi. Tekrar deneyin." : `${body.deleted} taslak silindi.${body.skipped ? ` ${body.skipped} fiş artık taslak olmadığı için silinmedi.` : ""}`);
  }

  const note = others ? "Aktarılmış fişler değişmez." : approved.length && !drafts.length ? "Onaylı fiş silinmez; önce taslağa alın." : "";
  return (
    <div className={ids.length || message ? "select-bar select-bar-on" : "select-bar"} data-chosen={ids.length || undefined}>
      {ids.length ? (
        <>
          <p className="select-count"><strong>{ids.length}</strong> fiş seçildi</p>
          <button className="btn btn-quiet btn-sm select-clear" type="button" disabled={!!busy} onClick={() => s.setAll(false)}>Seçimi kaldır</button>
          {drafts.length ? <button className="btn btn-primary" type="button" disabled={!!busy} onClick={approve}>{busy === "approve" ? "Onaylanıyor…" : `${drafts.length} taslağı onayla`}</button> : null}
          {approved.length ? <button className="btn select-reopen" type="button" disabled={!!busy} onClick={reopen}>{busy === "reopen" ? "Taslağa alınıyor…" : `${approved.length} onaylıyı taslağa al`}</button> : null}
          {/* At the far end, so a habitual click on the approve spot never lands on delete. */}
          {drafts.length ? <button className="btn btn-danger select-delete" type="button" disabled={!!busy} onClick={remove}>{busy === "delete" ? "Siliniyor…" : `Seçilen ${drafts.length} taslağı sil`}</button> : null}
          {note ? <p className="muted small select-note">{note}</p> : null}
        </>
      ) : null}
      {/* The last result shows until the next tick (toggle and select-all clear it). */}
      <p ref={status} role="status" tabIndex={-1} className="muted small select-status">{message}</p>
    </div>
  );
}
