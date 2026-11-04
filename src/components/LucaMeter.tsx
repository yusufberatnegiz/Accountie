"use client";

import { useEffect, useRef } from "react";
import { Odometer } from "./home/Odometer";

/** Luca takes one file of at most 50 receipts and 400 lines; the meter shows how full the next file is. */
export function LucaMeter({ label, value, max }: { label: string; value: number; max: number }) {
  const fill = useRef<HTMLSpanElement>(null);
  const ratio = Math.min(1, value / max);
  // The fill grows from what this tab last showed, so a receipt approved on its own screen is seen joining the file.
  useEffect(() => {
    const key = `luca-dosyasi-${label}`;
    let last: number | null = null;
    try {
      const stored = sessionStorage.getItem(key);
      last = stored === null ? null : Number(stored);
      sessionStorage.setItem(key, String(ratio));
    } catch {}
    if (last === null || last === ratio || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    fill.current?.animate([{ transform: `scaleX(${last})` }, { transform: `scaleX(${ratio})` }], { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  }, [label, ratio]);
  return (
    <div className="meter">
      <p className="meter-head"><span>{label}</span><span className="num"><Odometer value={String(value)} className="meter-value" /> / {max}</span></p>
      <span className="meter-track" aria-hidden="true"><span ref={fill} className="meter-fill" style={{ transform: `scaleX(${ratio})` }} /></span>
    </div>
  );
}
