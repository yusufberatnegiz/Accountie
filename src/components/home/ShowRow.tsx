"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

  return (
    <div className="show-stage">
      <div className="show-row">
        {pieces.map((p, i) => (
          <figure className="show-piece" key={p.name} data-lit={i === active || undefined}>
            <div className="show-ui"><AppWindow title={p.screen} className="show-win">{p.body}</AppWindow></div>
            <figcaption className="show-cap">
              <span className="show-cap-name">{p.name}</span> <span className="show-cap-text">{p.text}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="show-side">
        <div className="show-tabs" data-hl={clip ? "" : undefined}>
          <ul className="show-index" aria-label="Parçalar" ref={list}>
            {pieces.map((p, i) => (
              <li key={p.name}>
                <button type="button" className="show-pick" aria-pressed={i === active} onClick={() => setActive(i)}>{p.name}</button>
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
    </div>
  );
}
