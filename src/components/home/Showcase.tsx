"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Piece = { name: string; text: string; body: ReactNode };

/**
 * Lit panel, dark row (YON.md 3.4.3): a scroll-snap row; the centred piece is lit, the rest are faded and inert.
 * Buttons and arrow keys move the row too, so it never needs a drag.
 */
export function Showcase({ pieces }: { pieces: Piece[] }) {
  const row = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    let frame = 0;
    const pick = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
        let best = 0;
        let dist = Infinity;
        [...el.children].forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const d = Math.abs(r.left + r.width / 2 - mid);
          if (d < dist) { dist = d; best = i; }
        });
        setActive(best);
      });
    };
    pick();
    el.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => { el.removeEventListener("scroll", pick); window.removeEventListener("resize", pick); cancelAnimationFrame(frame); };
  }, []);

  const go = (i: number) => {
    const el = row.current;
    const target = el?.children[Math.max(0, Math.min(pieces.length - 1, i))] as HTMLElement | undefined;
    if (!el || !target) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto" });
  };

  const piece = pieces[active];
  return (
    <div className="show-stage">
      <div className="show-row" ref={row} tabIndex={0} aria-label="Ürün parçaları"
        onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); } }}>
        {pieces.map((p, i) => (
          <div key={p.name} className="show-piece" data-ui data-lit={i === active || undefined} inert={i !== active} aria-label={p.name} role="group">
            {p.body}
          </div>
        ))}
      </div>
      <div className="show-caption">
        <p className="show-name" aria-live="polite">{piece.name}</p>
        <p className="show-text">{piece.text}</p>
        <div className="show-nav">
          <button type="button" className="btn show-btn" onClick={() => go(active - 1)} disabled={active === 0}>Önceki</button>
          <span className="show-count">{active + 1} / {pieces.length}</span>
          <button type="button" className="btn show-btn" onClick={() => go(active + 1)} disabled={active === pieces.length - 1}>Sonraki</button>
        </div>
      </div>
    </div>
  );
}
