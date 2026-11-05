"use client";

import { useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

export type Qa = { q: string; a: string };

/**
 * Question index, one answer (YON.md 3.4.7). Each question is a details/summary, so without script every answer still opens
 * (YON 23.15). With script a click (or Enter/Space) selects a question; on desktop the sticky pane shows it, keyboard focus and a
 * mouse hover only preview it there, so the announced state never follows the pointer. Touch never previews: a tap's
 * compatibility events would otherwise leave another row marked open. Phone: the answer opens under its question.
 */
export function Faq({ items, titleId }: { items: Qa[]; titleId: string }) {
  const [open, setOpen] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
  const shown = peek ?? (open < 0 ? 0 : open);
  const mousePeek = (i: number) => (e: PointerEvent) => { if (e.pointerType === "mouse") setPeek(i); };
  // React owns the open state once it runs: the pane on desktop always shows one answer; on a phone a second tap closes it.
  const pick = (i: number) => (e: MouseEvent) => {
    e.preventDefault();
    const pane = matchMedia("(min-width: 901px)").matches;
    setOpen(pane || open !== i ? i : -1);
    setPeek(null);
  };
  return (
    <div className="faq-grid">
      <h2 className="t-head faq-title" id={titleId}>Sık sorulanlar</h2>
      <ul className="faq-list" onPointerLeave={() => setPeek(null)}>
        {items.map((it, i) => (
          <li key={it.q} data-open={i === open || undefined} data-shown={i === shown || undefined} style={{ "--r": i + 1 } as CSSProperties}>
            <details open={i === open}>
              <summary className="faq-q" onClick={pick(i)} onPointerEnter={mousePeek(i)} onFocus={() => setPeek(i)} onBlur={() => setPeek(null)}>
                <span>{it.q}</span>
                <svg className="faq-chev" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" /></svg>
              </summary>
              <p className="faq-a-inline">{it.a}</p>
            </details>
          </li>
        ))}
      </ul>
      <div className="faq-pane" aria-hidden="true">
        <p key={shown} className="faq-a faq-a-text">{items[shown].a}</p>
      </div>
    </div>
  );
}
