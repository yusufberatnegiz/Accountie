"use client";

import { useState, type ReactNode } from "react";

export type Piece = { name: string; text: string; body: ReactNode };

/**
 * Showcase "Lit panel, dark row" (YON.md 3.4.3): six product pieces stacked in one place; the chosen one is shown whole,
 * never a neighbour cut at an edge. The picker is a column of tabs on the right (a filled tab is the shown piece), the piece's name and sentence under it.
 * Without script the first piece shows; every piece carries its own caption (shown on phones, read by screen readers).
 */
export function ShowRow({ pieces }: { pieces: Piece[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="show-stage">
      <div className="show-row">
        {pieces.map((p, i) => (
          <figure className="show-piece" key={p.name} data-lit={i === active || undefined}>
            <div className="show-ui" data-ui inert={i !== active}>{p.body}</div>
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
        <div className="show-now" aria-hidden="true">
          <h3 className="show-name" key={active}>{pieces[active].name}</h3>
          <p className="show-text">{pieces[active].text}</p>
        </div>
      </div>
    </div>
  );
}
