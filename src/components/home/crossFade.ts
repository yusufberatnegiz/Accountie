import { flushSync } from "react-dom";

type VtDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Runs a state change inside a 180ms view transition (home.css `html.vt-home`), so the old content cross-fades into the
 * new one and no frame is empty (YON.md 16.2). Without the API, or under reduced motion, the change is simply instant.
 */
export function crossFade(update: () => void) {
  const doc = document as VtDocument;
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) { update(); return; }
  const root = document.documentElement;
  root.classList.add("vt-home");
  // The transition waits for a rendered frame; if none comes (a throttled or minimised window), the change still lands.
  let done = false;
  const run = () => { if (!done) { done = true; flushSync(update); } };
  setTimeout(run, 300);
  doc.startViewTransition(run).finished.finally(() => root.classList.remove("vt-home"));
}
