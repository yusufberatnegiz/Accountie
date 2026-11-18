"use client";

import { useRouter } from "next/navigation";
import { createContext, startTransition, useContext, useRef, useState, type ReactNode } from "react";

type Status = "draft" | "approved" | "exported";
type Ctx = { chosen: ReadonlySet<string>; toggle: (id: string) => void; setAll: (on: boolean) => void; statuses: Record<string, Status> };
const Selection = createContext<Ctx | null>(null);

/**
 * Receipts picked on the list (its checkboxes), and what can be done to them at once: the drafts approved, the approved ones taken back
 * to draft. `statuses`: every row the list shows, so the bar can say how many of the picked ones each step reaches.
 */
export function ListSelection({ statuses, children }: { statuses: Record<string, Status>; children: ReactNode }) {
  // The checkboxes show only after "Seç": a row is opened by a press, never ticked by a stray one.
  const [on, setOn] = useState(false);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) => setChosen((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });
  const setAll = (on: boolean) => setChosen(on ? new Set(Object.keys(statuses)) : new Set());
  // A row that left the list (deleted, another tab or month) is never acted on unseen.
  const shown = new Set([...chosen].filter((id) => id in statuses));
  return (
    <Selection.Provider value={{ chosen: shown, toggle, setAll, statuses }}>
      <div className="list-select" data-on={on || undefined}>
        <div className="select-toggle">
          <button className="btn btn-sm" type="button" aria-pressed={on} onClick={() => { if (on) setChosen(new Set()); setOn(!on); }}>{on ? "Bitti" : "Seç"}</button>
        </div>
        {children}
      </div>
      <SelectionBar />
    </Selection.Provider>
  );
}

export function RowCheck({ id, label }: { id: string; label: string }) {
  const s = useContext(Selection);
  if (!s) return null;
  return <input type="checkbox" className="row-check" checked={s.chosen.has(id)} onChange={() => s.toggle(id)} aria-label={`${label} seç`} />;
}

export function AllCheck() {
  const s = useContext(Selection);
  if (!s) return null;
  const n = Object.keys(s.statuses).length;
  const all = n > 0 && s.chosen.size === n;
  return <input type="checkbox" className="row-check" checked={all} ref={(el) => { if (el) el.indeterminate = s.chosen.size > 0 && !all; }}
    onChange={() => s.setAll(!all)} aria-label="Listedeki bütün fişleri seç" />;
}

function SelectionBar() {
  const s = useContext(Selection)!;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const status = useRef<HTMLParagraphElement>(null);
  const ids = [...s.chosen];
  const drafts = ids.filter((id) => s.statuses[id] === "draft");
  const approved = ids.filter((id) => s.statuses[id] === "approved");
  const done = (text: string) => { setMessage(text); s.setAll(false); setBusy(false); status.current?.focus(); startTransition(() => router.refresh()); };

  async function approve() {
    if (!confirm(`Seçilen ${drafts.length} taslak onaylansın mı? Uyarısı olan fişler de onaylanır; araç türü seçilmemiş, mali değeri olmayan ya da satırları tutmayan fişler taslak kalır.`)) return;
    setBusy(true);
    const res = await fetch("/api/receipts/bulk-approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: drafts, selected: true }) }).catch(() => null);
    const body = res?.ok ? ((await res.json()) as { approved: number; skipped: number; stopped?: boolean }) : null;
    done(!body ? "Fişler onaylanamadı. Tekrar deneyin." : `${body.approved} fiş onaylandı.${body.stopped ? " Kalanlar bir hata yüzünden onaylanamadı; tekrar deneyin." : body.skipped ? ` ${body.skipped} fiş taslak kaldı; açıp eksiğini tamamlayın.` : ""}`);
  }

  async function reopen() {
    if (!confirm(`Seçilen ${approved.length} onaylı fiş taslağa alınsın mı? Eklentide ve Luca dosyasında görünmezler; yeniden onaylanana kadar beklerler.`)) return;
    setBusy(true);
    let n = 0;
    // shortcut: one request per receipt, in order (a list holds at most 200); a bulk route if lists grow.
    for (const id of approved) if ((await fetch(`/api/receipts/${id}/reopen`, { method: "POST" }).catch(() => null))?.ok) n++;
    done(`${n} fiş taslağa alındı.${n < approved.length ? ` ${approved.length - n} fiş alınamadı; listeyi yenileyip tekrar deneyin.` : ""}`);
  }

  return (
    <div className={ids.length || message ? "select-bar select-bar-on" : "select-bar"}>
      {ids.length ? (
        <>
          <p className="select-count"><strong>{ids.length}</strong> fiş seçildi</p>
          {drafts.length ? <button className="btn btn-primary" type="button" disabled={busy} onClick={approve}>{drafts.length} taslağı onayla</button> : null}
          {approved.length ? <button className="btn" type="button" disabled={busy} onClick={reopen}>{approved.length} onaylıyı taslağa al</button> : null}
          {ids.length > drafts.length + approved.length ? <span className="muted small">Aktarılmış fişler değişmez.</span> : null}
          <button className="btn btn-quiet" type="button" disabled={busy} onClick={() => s.setAll(false)}>Seçimi kaldır</button>
        </>
      ) : null}
      <p ref={status} role="status" tabIndex={-1} className="muted small select-status">{message}</p>
    </div>
  );
}
