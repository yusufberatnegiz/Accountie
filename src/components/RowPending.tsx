"use client";

import { useLinkStatus } from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DRAWER = "cubic-bezier(0.2, 0, 0, 1)";
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The drawer opened at the press, handed to RowDetail when the receipt arrives: its row and how far it had opened. */
export let opening: { row: Element; height: number } | null = null;
export const takeOpening = (row: Element | null | undefined) => { const o = opening && opening.row === row ? opening : null; opening = null; return o; };

/**
 * Inside a list row's link: while its receipt loads (the page comes from the server), a thin bar runs along the row and the drawer
 * under it already opens, with a skeleton, so the press answers at once. When the receipt arrives the skeleton goes in the same commit
 * and RowDetail carries on from where this drawer got to.
 */
export function RowPending() {
  const { pending } = useLinkStatus();
  const bar = useRef<HTMLSpanElement>(null);
  const [cell, setCell] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const row = bar.current?.closest("tr");
    // Only opening: the open row's own link closes it (RowDetail rolls it up).
    if (!pending || !row || row.hasAttribute("data-open")) return;
    const tr = document.createElement("tr");
    tr.className = "row-detail row-ghost";
    tr.setAttribute("aria-hidden", "true");
    const td = document.createElement("td");
    td.colSpan = 7;
    const roll = document.createElement("div");
    roll.className = "row-detail-roll";
    td.append(roll);
    tr.append(td);
    row.after(tr);
    row.setAttribute("data-open", "");
    const top = roll.getBoundingClientRect().top;
    const target = Math.max(160, Math.min(560, innerHeight - top + 48));
    roll.style.height = `${target}px`;
    roll.style.overflow = "hidden";
    if (!still() && !document.hidden) roll.animate([{ height: "0px" }, { height: `${target}px` }], { duration: Math.min(360, 240 + target / 6), easing: DRAWER });
    setCell(roll);
    return () => {
      opening = { row, height: roll.getBoundingClientRect().height };
      // React sets data-open again in this commit when the receipt opened; otherwise (another row pressed, an error) the row closes.
      row.removeAttribute("data-open");
      tr.remove();
      setCell(null);
    };
  }, [pending]);
  return (
    <>
      {pending ? <span ref={bar} className="row-pending" aria-hidden="true" /> : null}
      {cell ? createPortal(
        <div className="row-ghost-body">
          <span className="sk" style={{ width: "28%", height: 18 }} />
          <span className="sk" style={{ width: "100%", height: 44 }} />
          <span className="sk" style={{ width: "100%", height: 44 }} />
          <span className="sk" style={{ width: "100%", height: 44 }} />
          <span className="sk" style={{ width: "62%", height: 44 }} />
        </div>, cell) : null}
    </>
  );
}
