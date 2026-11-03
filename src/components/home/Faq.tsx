"use client";

import { useId, useState, type CSSProperties } from "react";

export type Qa = { q: string; a: string };

/**
 * Question index, one answer (YON.md 3.4.7). Desktop: click and focus select a question (aria-expanded follows them);
 * hover only previews it in the sticky pane, so the announced state never follows the pointer. The pane repeats the question as its heading.
 * Phone: the same buttons open their answer underneath (CSS decides which copy is shown).
 */
export function Faq({ items, titleId }: { items: Qa[]; titleId: string }) {
  const [open, setOpen] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
  const id = useId();
  const shown = peek ?? open;
  return (
    <div className="faq-grid">
      <h2 className="t-head faq-title" id={titleId} data-reveal>Sık sorulanlar</h2>
      <ul className="faq-list" onMouseLeave={() => setPeek(null)}>
        {items.map((it, i) => (
          <li key={it.q} data-open={i === shown || undefined} data-reveal style={{ "--r": i + 1 } as CSSProperties}>
            <button type="button" className="faq-q" aria-expanded={i === open} aria-controls={`${id}-a${i}`}
              onClick={() => { setOpen(i); setPeek(null); }} onMouseEnter={() => setPeek(i)} onFocus={() => { setOpen(i); setPeek(null); }}>
              <span>{it.q}</span>
              <svg className="faq-chev" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" /></svg>
            </button>
            <p className="faq-a-inline" id={`${id}-a${i}`} hidden={i !== open}>{it.a}</p>
          </li>
        ))}
      </ul>
      <div className="faq-pane" aria-hidden="true">
        <div key={shown} className="faq-a">
          <p className="faq-a-q">{items[shown].q}</p>
          <p className="faq-a-text">{items[shown].a}</p>
        </div>
      </div>
    </div>
  );
}
