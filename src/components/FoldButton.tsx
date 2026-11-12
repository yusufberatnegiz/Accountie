"use client";

import { useSyncExternalStore } from "react";

// The head script (src/lib/csp.ts) reads this key and marks <html> before first paint.
const KEY = "accountie-rail";

const subscribe = (cb: () => void) => {
  addEventListener("accountie-fold", cb);
  return () => removeEventListener("accountie-fold", cb);
};

/** Folds the wide sidebar back to the icon rail. The choice stays in this browser only. */
export function FoldButton() {
  const folded = useSyncExternalStore(subscribe, () => document.documentElement.dataset.rail === "dar", () => false);
  function toggle() {
    const root = document.documentElement;
    if (folded) delete root.dataset.rail;
    else root.dataset.rail = "dar";
    try {
      if (folded) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, "1");
    } catch {}
    dispatchEvent(new Event("accountie-fold"));
  }
  return (
    <button type="button" className="rail-item rail-fold" onClick={toggle} aria-pressed={folded} aria-label={folded ? "Menüyü genişlet" : "Menüyü daralt"}>
      <svg className="rail-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1" /><path d="M6 2.75v10.5" /></svg>
      <span className="rail-label" aria-hidden="true">{folded ? "Genişlet" : "Daralt"}</span>
    </button>
  );
}
