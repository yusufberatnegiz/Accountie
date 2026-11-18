"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A receipt opened under its row. Its row comes into view when the open row moved off screen (another one above closed, or the next
 * draft opened after an approval), and keyboard focus goes to that row's link.
 */
export function RowDetail({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = ref.current?.closest("tr")?.previousElementSibling ?? ref.current;
    if (!row) return;
    const top = row.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.6) row.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    if (!ref.current?.contains(document.activeElement)) row.querySelector<HTMLElement>(".row-link")?.focus({ preventScroll: true });
  }, [id]);
  return <div ref={ref} id={`fis-detay-${id}`}>{children}</div>;
}
