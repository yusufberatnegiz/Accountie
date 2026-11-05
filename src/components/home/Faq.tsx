"use client";

import { useId, useState, type CSSProperties, type PointerEvent } from "react";

export type Qa = { q: string; a: string };

/**
 * Question index, one answer (YON.md 3.4.7). Desktop: a click (or Enter/Space) selects a question and aria-expanded follows it; keyboard focus only previews it in the pane;
 * a mouse hover only previews it in the sticky pane, so the announced state never follows the pointer. Touch never previews:
 * a tap's compatibility events would otherwise leave another row marked open. The chosen question shares the pane's tone,
 * so the pane shows only the answer. Phone: the same buttons open their answer underneath (CSS decides which copy is shown).
 */
export function Faq({ items, titleId }: { items: Qa[]; titleId: string }) {
  const [open, setOpen] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
  const id = useId();
  const shown = peek ?? open;
  const mousePeek = (i: number) => (e: PointerEvent) => { if (e.pointerType === "mouse") setPeek(i); };
  return (
    <div className="faq-grid">
      <h2 className="t-head faq-title" id={titleId} data-reveal>Sık sorulanlar</h2>
      <ul className="faq-list" onPointerLeave={() => setPeek(null)}>
        {items.map((it, i) => (
          <li key={it.q} data-open={i === open || undefined} data-shown={i === shown || undefined} data-reveal style={{ "--r": i + 1 } as CSSProperties}>
            <button type="button" className="faq-q" aria-expanded={i === open} aria-controls={`${id}-a${i}`}
              onClick={() => { setOpen(i); setPeek(null); }} onPointerEnter={mousePeek(i)} onFocus={() => setPeek(i)} onBlur={() => setPeek(null)}>
              <span>{it.q}</span>
              <svg className="faq-chev" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" /></svg>
            </button>
            <p className="faq-a-inline" id={`${id}-a${i}`} hidden={i !== open}>{it.a}</p>
          </li>
        ))}
      </ul>
      <div className="faq-pane" aria-hidden="true">
        <p key={shown} className="faq-a faq-a-text">{items[shown].a}</p>
      </div>
    </div>
  );
}
