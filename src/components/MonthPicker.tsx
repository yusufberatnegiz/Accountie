"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { monthLabel } from "@/lib/month";

/** The month a screen shows (?ay=2026-09); "Bütün aylar" drops it. Keeps the screen's other query values (the tab). */
export function MonthPicker({ months, value, path, allLabel = "Bütün aylar" }: { months: string[]; value: string; path: string; allLabel?: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <label className="month-picker">
      <span>Ay</span>
      <select className="field" value={value} onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set("ay", e.target.value); else next.delete("ay");
        const q = next.toString();
        router.push(q ? `${path}?${q}` : path);
      }}>
        {allLabel ? <option value="">{allLabel}</option> : null}
        {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
    </label>
  );
}
