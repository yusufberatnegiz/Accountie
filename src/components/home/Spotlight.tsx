"use client";

import { useRef, useState } from "react";

export type SpotRead = { id: string; label: string; value: string };
export type SpotLine = { code: string; name: string; debit: string; credit: string; from: string[] };

type Path = { d: string; x: number; y: number; w: number; h: number; a: [number, number]; b: [number, number] };

/**
 * Spotlight link (YON.md 23.3.5): pointing at, focusing or tapping a Luca line marks the read fields it came from, draws one
 * line from the first source to the row, and steps the rest of the piece back. Rows are focus stops and read their sources
 * through aria-describedby. Layout is read only when a row is chosen.
 */
export function Spotlight({ read, lines, meta }: { read: SpotRead[]; lines: SpotLine[]; meta: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState<number | null>(null);
  const [path, setPath] = useState<Path | null>(null);

  function show(i: number, row: HTMLElement) {
    const root = box.current;
    const src = root?.querySelector<HTMLElement>(`[data-spot="${lines[i].from[0]}"]`);
    if (!root || !src) return;
    const o = root.getBoundingClientRect();
    const s = src.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const x1 = s.right - o.left + 6, y1 = s.top + s.height / 2 - o.top;
    const x2 = r.left - o.left + 4, y2 = r.top + r.height / 2 - o.top;
    const x = Math.min(x1, x2) - 4, y = Math.min(y1, y2) - 4, w = Math.abs(x2 - x1) + 8, h = Math.abs(y2 - y1) + 8;
    const a: [number, number] = [x1 - x, y1 - y], b: [number, number] = [x2 - x, y2 - y];
    const mx = (a[0] + b[0]) / 2;
    setPath({ d: `M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`, x, y, w, h, a, b });
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
              <tr key={l.code} tabIndex={0} className="spot-row" data-lit={on === i || undefined}
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
        <svg key={`${on}-${path.d}`} className="spot-link" aria-hidden="true" width={path.w} height={path.h}
          style={{ left: path.x, top: path.y }} viewBox={`0 0 ${path.w} ${path.h}`}>
          <path d={path.d} />
          <circle cx={path.a[0]} cy={path.a[1]} r="2" />
          <circle cx={path.b[0]} cy={path.b[1]} r="2" />
        </svg>
      ) : null}
    </div>
  );
}
