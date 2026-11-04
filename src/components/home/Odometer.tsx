"use client";

import { useState, type CSSProperties } from "react";

/**
 * A figure that changes by rolling only its changed digits (YON.md 23.3.3): the old digit leaves upward, the new one arrives
 * from below, two slots and never an in-between value. Points and commas stay put. A new value during a roll restarts from the
 * value on screen, so quick choices land on the last one. The real value is plain text for screen readers; the slots are aria-hidden.
 */
export function Odometer({ value, className }: { value: string; className?: string }) {
  const [cur, setCur] = useState(value);
  const [old, setOld] = useState(value);
  if (value !== cur) { setOld(cur); setCur(value); }
  // Right-aligned, so 980,00 -> 1.250,00 rolls the units under the units.
  const n = Math.max(cur.length, old.length);
  const a = old.padStart(n, " ");
  const b = cur.padStart(n, " ");
  let k = 0;
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
