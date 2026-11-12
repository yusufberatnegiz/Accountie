"use client";

import { useSyncExternalStore } from "react";

/** localStorage keys; the head script (src/lib/csp.ts) reads them and marks <html> before first paint. */
export const FOLD_KEYS = { rail: "accountie-rail", side: "accountie-side" } as const;
type Part = keyof typeof FOLD_KEYS;

const subscribe = (cb: () => void) => {
  addEventListener("accountie-fold", cb);
  return () => removeEventListener("accountie-fold", cb);
};

const ICON = <svg className="rail-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1" /><path d="M6 2.75v10.5" /></svg>;

/** Folds the sidebar (rail) or the list's side column. The choice stays in this browser only. */
export function FoldButton({ part }: { part: Part }) {
  const folded = useSyncExternalStore(subscribe, () => document.documentElement.dataset[part] === "dar", () => false);
  function toggle() {
    const root = document.documentElement;
    if (folded) delete root.dataset[part];
    else root.dataset[part] = "dar";
    try {
      if (folded) localStorage.removeItem(FOLD_KEYS[part]);
      else localStorage.setItem(FOLD_KEYS[part], "1");
    } catch {}
    dispatchEvent(new Event("accountie-fold"));
  }
  if (part === "rail") {
    return (
      <button type="button" className="rail-item rail-fold" onClick={toggle} aria-pressed={folded} aria-label={folded ? "Menüyü genişlet" : "Menüyü daralt"}>
        {ICON}<span className="rail-label" aria-hidden="true">{folded ? "Genişlet" : "Daralt"}</span>
      </button>
    );
  }
  return <button type="button" className="btn side-fold" onClick={toggle} aria-pressed={folded}>{folded ? "Paneli göster" : "Paneli gizle"}</button>;
}
