"use client";

import { useEffect } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The homepage's two scroll scenes (YON.md 23.3.1 and 23.3.4). Nothing here hides content: server output is each scene's end
 * state, and without this script (or with reduced motion) that is what stays on screen.
 *
 * Rule scene: each flying copy is measured once against the receipt figure it leaves from (and again on resize), as CSS
 * variables; the move itself is CSS. From 1100px with scroll-driven animations the scene is tied to the scroll ("scroll"),
 * otherwise it plays once when the ledger's rows are whole on screen, or at once if the scene is already passed ("timed").
 * Path scene: the clause row under the screen's middle line sets which of the four states the sticky card shows. The rows
 * touch, so after any jump (PageDown, an anchor, a reload mid-page) exactly one row holds the line and reports it. The state is written
 * on the stage (data-active) and on the one field that holds it (data-on), so a change restyles those few nodes, not the section;
 * transitions start only after the first report, so a fast entry never shows the wipe from the server's state.
 */
export function HomeMotion() {
  // On a phone "Bir fişin yolu" is a sideways scroller (CSS, any motion setting): it is a keyboard stop there and only there.
  useEffect(() => {
    const path = document.querySelector<HTMLElement>(".path");
    if (!path) return;
    const phone = matchMedia("(max-width: 640px)");
    const set = () => (phone.matches ? path.setAttribute("tabindex", "0") : path.removeAttribute("tabindex"));
    set();
    phone.addEventListener("change", set);
    return () => phone.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    const offs: (() => void)[] = [];

    const rule = document.querySelector<HTMLElement>('[data-scene="rule"]');
    if (rule) {
      const measure = () => {
        const wide = matchMedia("(min-width: 1100px)").matches && CSS.supports("animation-timeline: view()");
        // Setting the mode starts the scene's ~20 animations (a costly style pass); an unchanged value would redo it.
        if (rule.dataset.mode !== (wide ? "scroll" : "timed")) rule.dataset.mode = wide ? "scroll" : "timed";
        // All reads before any write: a write between reads forces a fresh style and layout per copy (the 4x CPU scroll LoAF).
        // The gutter between the paper and the ledger: the chip goes down or up in it, never over printed words.
        const paper = rule.querySelector(".rule-receipt")?.getBoundingClientRect();
        const ledger = rule.querySelector(".rule-ledger")?.getBoundingClientRect();
        const gx = paper && ledger ? (paper.right + ledger.left) / 2 : 0;
        const moves = [...rule.querySelectorAll<HTMLElement>("[data-fly]")].map((copy) => {
          const src = rule.querySelector<HTMLElement>(`[data-amt="${copy.dataset.fly}"] > span:last-child`);
          const cell = copy.parentElement;
          if (!src || !cell) return null;
          const s = src.getBoundingClientRect();
          const c = cell.getBoundingClientRect();
          const chip = copy.querySelector<HTMLElement>(".fly-s");
          const pad = chip ? parseFloat(getComputedStyle(chip).paddingRight) : 0;
          const scale = parseFloat(getComputedStyle(src).fontSize) / parseFloat(getComputedStyle(cell).fontSize);
          // The row line the chip slides along: its own row's top or bottom edge, whichever is nearer the paper's figure, so it
          // travels between the rows' text, never over an account name (YON 23.28).
          const row = cell.closest("tr")?.getBoundingClientRect() ?? c;
          const sy = s.top + s.height / 2, cy = c.top + c.height / 2;
          const edge = Math.abs(sy - row.top) < Math.abs(sy - row.bottom) ? row.top : row.bottom;
          // The chip's text, not its padded box, starts exactly on the printed figure (scaled about its right edge).
          const w = copy.getBoundingClientRect().width;
          return [copy, `${s.right - c.right + pad}px`, `${sy - cy}px`, String(scale), `${edge - cy}px`, `${gx + w / 2 - c.right}px`] as const;
        });
        for (const m of moves) {
          if (!m) continue;
          m[0].style.setProperty("--dx", m[1]);
          m[0].style.setProperty("--dy", m[2]);
          m[0].style.setProperty("--sc", m[3]);
          m[0].style.setProperty("--dg", m[4]);
          m[0].style.setProperty("--dxg", m[5]);
        }
      };
      // Not in the hydration task: measuring there renders the page's content-visibility sections (the 4x CPU long task, YON 23.14).
      // That first pass sets the mode, so it runs when the page is idle after load, not inside a scroll frame (4x CPU: a ~100 ms
      // LoAF at the scene's approach, YON 23.17); the approach then only re-measures, which writes the copies' variables only.
      const ric = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1));
      const cic = window.cancelIdleCallback ?? clearTimeout;
      let idle = 0;
      document.fonts.ready.then(() => { idle = ric(() => { idle = 0; measure(); }, { timeout: 3000 }); });
      // The approach pass also waits for an idle moment (its first layout of the scene was a 107 ms task at 4x CPU, YON 23.24).
      const near = new IntersectionObserver(([e]) => { if (e.isIntersecting || e.boundingClientRect.bottom < 0) { near.disconnect(); if (idle) cic(idle); idle = ric(() => { idle = 0; measure(); }, { timeout: 500 }); } }, { rootMargin: "150% 0px" });
      near.observe(rule);
      let raf = 0;
      const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
      addEventListener("resize", onResize);
      // Timed mode starts with play() on the paused CSS animations once most of the ledger is on screen (the receipt is then
      // on screen above it on a phone): no class on the scene root, so no style pass over its subtree in a scroll frame (YON 23.18).
      const io = new IntersectionObserver(([e]) => {
        if (!(e.intersectionRatio >= 0.6 || e.boundingClientRect.bottom < 0)) return;
        io.disconnect();
        if (rule.dataset.mode === "timed") raf = requestAnimationFrame(() => rule.getAnimations({ subtree: true }).forEach((a) => a.play()));
      }, { threshold: [0, 0.6] });
      // The table, not the balance strip under it: the scene starts when 60% of it is on screen, where a reader stops (YON 23.28).
      io.observe(rule.querySelector(".rule-table") ?? rule);
      offs.push(() => { if (idle) cic(idle); near.disconnect(); cancelAnimationFrame(raf); removeEventListener("resize", onResize); io.disconnect(); delete rule.dataset.mode; });
    }

    const path = document.querySelector<HTMLElement>(".path");
    // "Bir fişin yolu" is laid out (content-visibility) a screen and a half before it arrives, in an idle moment, not in the
    // scroll frame that reaches it (a 122 ms task at 4x CPU, YON 23.24).
    if (path) {
      const ric = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1));
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); ric(() => path.classList.add("is-near"), { timeout: 600 }); } }, { rootMargin: "150% 0px" });
      io.observe(path);
      offs.push(() => io.disconnect());
    }
    const stage = path?.querySelector<HTMLElement>(".path-stage");
    if (path && stage) {
      const fields = [...path.querySelectorAll<HTMLElement>(".path-field")];
      let ready = 0;
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const n = (e.target.parentElement as HTMLElement).dataset.n ?? "1";
          if (!e.isIntersecting || stage.dataset.active === n) continue;
          stage.dataset.active = n;
          for (const f of fields) f.toggleAttribute("data-on", f.dataset.n === n);
        }
        if (!ready) ready = requestAnimationFrame(() => path.setAttribute("data-ready", ""));
      }, { rootMargin: "-50% 0px -50% 0px" });
      path.querySelectorAll(".path-clause").forEach((c) => io.observe(c));
      offs.push(() => { io.disconnect(); cancelAnimationFrame(ready); });
    }

    return () => offs.forEach((f) => f());
  }, []);
  return null;
}
