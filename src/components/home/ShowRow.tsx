"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type Piece = { name: string; text: string; body: ReactNode };

/**
 * Showcase "Lit panel, dark row" (YON.md 3.4.3): six product pieces in a scroll-snapped row; the centred one is lit,
 * the others are dimmed and inert. Its name and sentence sit in the 24ch column on the right; the names there move the row.
 * Without script the row still scrolls and every piece carries its own caption (shown on phones, read by screen readers).
 */
export function ShowRow({ pieces }: { pieces: Piece[] }) {
  const [active, setActive] = useState(0);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = row.current;
    if (!el || !("IntersectionObserver" in window)) return;
    // The piece crossing the row's centre line is the lit one.
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { root: el, rootMargin: "0px -49% 0px -49%", threshold: 0 });
    el.querySelectorAll<HTMLElement>("[data-i]").forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    const p = row.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (p && row.current) row.current.scrollTo({ left: p.offsetLeft - (row.current.clientWidth - p.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
    setActive(i);
  };

  return (
    <div className="show-stage">
      <div className="show-row" ref={row} role="region" aria-label="Ürün parçaları, yatay kaydırılır" tabIndex={0}>
        {pieces.map((p, i) => (
          <figure className="show-piece" key={p.name} data-i={i} data-lit={i === active || undefined} style={{ "--r": i } as CSSProperties} data-reveal>
            <div className="show-ui" data-ui inert={i !== active}>{p.body}</div>
            <figcaption className="show-cap">
              <span className="show-cap-name">{p.name}</span> <span className="show-cap-text">{p.text}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="show-side">
        <div className="show-now" aria-hidden="true">
          <p className="show-name" key={active}>{pieces[active].name}</p>
          <p className="show-text">{pieces[active].text}</p>
        </div>
        <ul className="show-index" aria-label="Parçalar">
          {pieces.map((p, i) => (
            <li key={p.name}>
              <button type="button" className="show-pick" aria-pressed={i === active} onClick={() => go(i)}>{p.name}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
