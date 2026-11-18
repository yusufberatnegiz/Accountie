"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A receipt opened under its row: when another row above it closed at the same time, its row is brought back into view. */
export function RowDetail({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = ref.current?.closest("tr")?.previousElementSibling;
    if (row && row.getBoundingClientRect().top < 0) row.scrollIntoView({ block: "start" });
  }, [id]);
  return <div ref={ref}>{children}</div>;
}
