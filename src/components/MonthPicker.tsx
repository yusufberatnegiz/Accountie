"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { monthLabel } from "@/lib/month";

/** The month a screen shows (?ay=2026-09); "Bütün aylar" drops it. Keeps the screen's other query values (the tab). */
export function MonthPicker({ months, value, path, allLabel = "Bütün aylar" }: { months: string[]; value: string; path: string; allLabel?: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  // The chosen month shows at once; the list follows when the navigation lands (like the status tabs).
  const [shown, setShown] = useOptimistic(value);
  const [pending, startTransition] = useTransition();
  return (
    <label className="month-picker" aria-busy={pending || undefined}>
      <span>Ay</span>
      <select className="field" value={shown} onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set("ay", e.target.value); else next.delete("ay");
        const q = next.toString();
        const month = e.target.value;
        startTransition(() => { setShown(month); router.push(q ? `${path}?${q}` : path); });
      }}>
        {allLabel ? <option value="">{allLabel}</option> : null}
        {shown && !months.includes(shown) ? <option value={shown}>{monthLabel(shown)}</option> : null}
        {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
    </label>
  );
}
