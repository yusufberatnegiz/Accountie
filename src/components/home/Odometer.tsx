"use client";

import { useState, type CSSProperties } from "react";

/**
 * A figure that changes by rolling only its changed digits (YON.md 23.3.3): the old digit leaves upward, the new one arrives
 * from below, two slots and never an in-between value. Points and commas stay put. A new value during a roll restarts from the
 * value on screen, so quick choices land on the last one. The real value is plain text for screen readers; the slots are aria-hidden.
 */
export function Odometer({ value, className, instant }: { value: string; className?: string; instant?: boolean }) {
  const [cur, setCur] = useState(value);
  const [old, setOld] = useState(value);
  // instant: the figure swaps without a roll (a total following the keys).
  if (value !== cur) { setOld(instant ? value : cur); setCur(value); }
  // Until the first change the figure is plain text: the first layout has no digit slots to lay out (4x CPU LCP, YON 23.20).
  if (old === cur) return <span className={`odo${className ? ` ${className}` : ""}`}>{cur}</span>;
  // Right-aligned, so 980,00 -> 1.250,00 rolls the units under the units.
  const n = Math.max(cur.length, old.length);
  const a = old.padStart(n, " ");
  const b = cur.padStart(n, " ");
  let k = 0;
  // A figure that changes length (8.725,00 -> 480,00) rolls as one block: per-digit slots would mix old and new digits into a wrong amount.
  if (old.length !== cur.length) {
    return (
      <span className={`odo${className ? ` ${className}` : ""}`}>
        <span className="visually-hidden">{cur}</span>
        <span className="odo-digits" aria-hidden="true"><span key={`w-${cur}`} className="odo-d odo-w" data-old={old}><span>{cur}</span></span></span>
      </span>
    );
  }
  return (
    <span className={`odo${className ? ` ${className}` : ""}`}>
      <span className="visually-hidden">{cur}</span>
      <span className="odo-digits" aria-hidden="true">
        {[...b].map((ch, i) => {
          if (ch === " ") return null;
          const changed = a[i] !== ch;
          return (
            <span key={changed ? `${i}-${cur}` : i} className="odo-d" data-old={changed ? a[i].trim() : undefined}
              style={changed ? ({ "--k": k++ } as CSSProperties) : undefined}>
              <span>{ch}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/**
 * A label that changes by one two-slot roll (YON.md 23.4): the old words leave upward, the new ones come from below. Used for a
 * status pill, a reading stage, a button's "Kopyalandı". Nothing rolls on first render; the words are plain text for screen readers.
 */
export function Roll({ value }: { value: string }) {
  const [cur, setCur] = useState(value);
  const [old, setOld] = useState<string | null>(null);
  if (value !== cur) { setOld(cur); setCur(value); }
  return (
    <>
      <span className="visually-hidden">{cur}</span>
      <span key={cur} className="roll-slot" data-old={old ?? undefined} aria-hidden="true"><span>{cur}</span></span>
    </>
  );
}
