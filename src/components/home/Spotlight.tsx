"use client";

import { useEffect, useRef, useState } from "react";

export type SpotRead = { id: string; label: string; value: string };
export type SpotLine = { code: string; name: string; debit: string; credit: string; from: string[] };

type Link = { d: string; a: [number, number]; b: [number, number] };
type Box = { x: number; y: number; w: number; h: number; links: Link[] };

/**
 * Spotlight link (YON.md 23.3.5): pointing at, focusing or tapping a Luca line marks the read fields it came from, draws a
 * line from the end of each source's value across the read panel's empty half to one point on the row, and steps the rest of the piece back. Rows are
 * focus stops and read their sources through aria-describedby. Layout is read only when a row is chosen; a resize clears it.
 */
export function Spotlight({ read, lines, meta }: { read: SpotRead[]; lines: SpotLine[]; meta: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState<number | null>(null);
  const [path, setPath] = useState<Box | null>(null);

  useEffect(() => {
    if (on === null) return;
    const clear = () => setOn(null);
    addEventListener("resize", clear);
    return () => removeEventListener("resize", clear);
  }, [on]);

  function show(i: number, row: HTMLElement) {
    const root = box.current;
    if (!root) return;
    const o = root.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const x2 = r.left - o.left - 2, y2 = r.top + r.height / 2 - o.top;
    const ends: [number, number][] = [];
    for (const id of lines[i].from) {
      const dd = root.querySelector<HTMLElement>(`[data-spot="${id}"] dd`);
      if (!dd) continue;
      // The end of the value's text, not of its box: the line then crosses the read panel's empty side to the row.
      const range = document.createRange();
      range.selectNodeContents(dd);
      const t = range.getBoundingClientRect();
      ends.push([t.right - o.left + 8, t.top + t.height / 2 - o.top]);
    }
    if (!ends.length) return;
    // Every source runs to one point on the row's edge (YON 23.15): two paths that join there, a 4px dot at each end.
    const lands = ends.map(() => y2);
    const xs = [...ends.map((e) => e[0]), x2], ys = [...ends.map((e) => e[1]), ...lands];
    const x = Math.min(...xs) - 4, y = Math.min(...ys) - 4;
    const w = Math.max(...xs) - x + 4, h = Math.max(...ys) - y + 4;
    const links = ends.map(([ex, ey], k) => {
      const a: [number, number] = [ex - x, ey - y];
      const b: [number, number] = [x2 - x, lands[k] - y];
      const mx = (a[0] + b[0]) / 2;
      return { d: `M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`, a, b };
    });
    setPath({ x, y, w, h, links });
    setOn(i);
  }
  const hide = () => setOn(null);
  const lit = on === null ? [] : lines[on].from;

  return (
    <div className="ui-card ui-review spot" ref={box} data-on={on === null ? undefined : ""}>
      <dl className="ui-read">
        {read.map((f) => (
          <div key={f.id} data-spot={f.id} data-lit={lit.includes(f.id) || undefined}>
            <dt>{f.label}</dt><dd id={`spot-${f.id}`}>{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="ui-review-lines">
        <table className="ui-table">
          <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} tabIndex={0} className="spot-row" data-lit={on === i || undefined}
                aria-describedby={l.from.map((f) => `spot-${f}`).join(" ")}
                onMouseEnter={(e) => show(i, e.currentTarget)} onMouseLeave={hide}
                onFocus={(e) => show(i, e.currentTarget)} onBlur={hide}
                onClick={(e) => show(i, e.currentTarget)}>
                <td><span className="code" translate="no">{l.code}</span><span className="code-name">{l.name}</span></td>
                <td className="num to-luca">{l.debit}</td>
                <td className="num to-luca">{l.credit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ui-meta">{meta}</p>
      </div>
      {path ? (
        <svg key={`${on}-${path.x}-${path.y}`} className="spot-link" aria-hidden="true" width={path.w} height={path.h}
          style={{ left: path.x, top: path.y }} viewBox={`0 0 ${path.w} ${path.h}`}>
          {path.links.map((l) => <path key={l.d} d={l.d} />)}
          {path.links.map((l) => <circle key={`a${l.d}`} cx={l.a[0]} cy={l.a[1]} r="2" />)}
          <circle cx={path.links[0].b[0]} cy={path.links[0].b[1]} r="2" />
        </svg>
      ) : null}
    </div>
  );
}
