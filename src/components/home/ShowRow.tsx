"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AppWindow } from "./Frames";

export type Piece = { name: string; screen: string; text: string; body: ReactNode };

/**
 * Showcase "Lit panel, dark row" (YON.md 3.4.3, 23.2): five product pieces in one place, each in an app window on the dark field; only the chosen one is shown and takes space,
 * and a change swaps it in place (the new piece rises 8px into the window), never a neighbour cut at an edge. The picker is one strip of tabs above the window, the piece's sentence beside it;
 * the window bar names the screen the piece comes from, not the tab again (YON 23.15).
 * The chosen tab's fill is one layer that slides to the new tab (a clip-path on a copy of the strip, the time and curve of the panel swap).
 * Without script every piece is shown, one under the other (html.js hides the unchosen ones); each carries its own caption.
 */
export function ShowRow({ pieces }: { pieces: Piece[] }) {
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const [clip, setClip] = useState<string | null>(null);

  // One read of the chosen tab's box per choice (and on resize); the copy of the strip shows only that box.
  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const place = () => {
      const b = ul.querySelectorAll<HTMLElement>(".show-pick")[active];
      if (!b) return;
      const r = ul.getBoundingClientRect(), t = b.getBoundingClientRect();
      setClip(`inset(${t.top - r.top}px ${r.right - t.right}px ${r.bottom - t.bottom}px ${t.left - r.left}px round 6px)`);
    };
    place();
    addEventListener("resize", place);
    return () => removeEventListener("resize", place);
  }, [active]);

  // Tabs (WAI-ARIA): one stop for the strip; arrows, Home and End move and choose.
  function onKey(e: KeyboardEvent<HTMLUListElement>) {
    const n = pieces.length;
    const to = e.key === "ArrowRight" ? (active + 1) % n : e.key === "ArrowLeft" ? (active - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    setActive(to);
    list.current?.querySelectorAll<HTMLElement>(".show-pick")[to]?.focus();
  }

  // The tabs come first in the DOM, as on screen (WCAG 2.4.3); the grid rows place them.
  return (
    <div className="show-stage">
      <div className="show-side">
        <div className="show-tabs" data-hl={clip ? "" : undefined}>
          <ul className="show-index" role="tablist" aria-label="Parçalar" ref={list} onKeyDown={onKey}>
            {pieces.map((p, i) => (
              <li key={p.name} role="presentation">
                <button type="button" role="tab" id={`parca-sekme-${i}`} className="show-pick" aria-selected={i === active} aria-controls={`parca-${i}`}
                  tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)}>{p.name}</button>
              </li>
            ))}
          </ul>
          {clip ? (
            <ul className="show-index show-hl" aria-hidden="true" style={{ clipPath: clip }}>
              {pieces.map((p) => <li key={p.name}><span className="show-pick">{p.name}</span></li>)}
            </ul>
          ) : null}
        </div>
        <div className="show-now" aria-hidden="true" key={active}>
          <p className="show-text">{pieces[active].text}</p>
        </div>
      </div>
      <div className="show-row">
        {pieces.map((p, i) => (
          <figure className="show-piece" key={p.name} id={`parca-${i}`} role="tabpanel" aria-labelledby={`parca-sekme-${i}`} data-lit={i === active || undefined}>
            <div className="show-ui"><AppWindow title={p.screen} className="show-win">{p.body}</AppWindow></div>
            <figcaption className="show-cap">
              <span className="show-cap-name">{p.name}</span> <span className="show-cap-text">{p.text}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
