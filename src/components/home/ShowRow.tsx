"use client";

import { useState, type ReactNode } from "react";
import { AppWindow } from "./Frames";

export type Piece = { name: string; text: string; body: ReactNode };

/**
 * Showcase "Lit panel, dark row" (YON.md 3.4.3, 23.2): five product pieces in one place, each in an app window on the dark field; only the chosen one is shown and takes space,
 * and a change swaps it in place (the new piece rises 8px into the window), never a neighbour cut at an edge. The picker is one strip of tabs above the window (a raised tab is the shown piece), the piece's name and sentence beside it.
 * Without script the first piece shows; every piece carries its own caption (shown on phones, read by screen readers).
 */
export function ShowRow({ pieces }: { pieces: Piece[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="show-stage">
      <div className="show-row">
        {pieces.map((p, i) => (
          <figure className="show-piece" key={p.name} data-lit={i === active || undefined}>
            <div className="show-ui" inert={i !== active}><AppWindow title={p.name} className="show-win">{p.body}</AppWindow></div>
            <figcaption className="show-cap">
              <span className="show-cap-name">{p.name}</span> <span className="show-cap-text">{p.text}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="show-side">
        <ul className="show-index" aria-label="Parçalar">
          {pieces.map((p, i) => (
            <li key={p.name}>
              <button type="button" className="show-pick" aria-pressed={i === active} onClick={() => setActive(i)}>{p.name}</button>
            </li>
          ))}
        </ul>
        <div className="show-now" aria-hidden="true" key={active}>
          <h3 className="show-name">{pieces[active].name}</h3>
          <p className="show-text">{pieces[active].text}</p>
        </div>
      </div>
    </div>
  );
}
