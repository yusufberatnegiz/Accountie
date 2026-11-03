"use client";

import { useId, useState, type CSSProperties } from "react";

export type Qa = { q: string; a: string };

/**
 * Question index, one answer (YON.md 3.4.7). Desktop: selection follows hover, click and focus, the answer sits in a sticky pane.
 * Phone: the same buttons open their answer underneath (CSS decides which copy is shown).
 */
export function Faq({ items, titleId }: { items: Qa[]; titleId: string }) {
  const [open, setOpen] = useState(0);
  const id = useId();
  return (
    <div className="faq-grid">
      <div className="faq-list">
        <h2 className="t-head faq-title" id={titleId} data-reveal>Sık sorulanlar</h2>
        <ul>
          {items.map((it, i) => (
            <li key={it.q} data-open={i === open || undefined} data-reveal style={{ "--r": i + 1 } as CSSProperties}>
              <button type="button" className="faq-q" aria-expanded={i === open} aria-controls={`${id}-a${i}`}
                onClick={() => setOpen(i)} onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)}>
                {it.q}
              </button>
              <p className="faq-a-inline" id={`${id}-a${i}`} hidden={i !== open}>{it.a}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="faq-pane" aria-hidden="true">
        <p key={open} className="faq-a">{items[open].a}</p>
      </div>
    </div>
  );
}
