"use client";

import { useEffect } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The homepage's two scroll scenes (YON.md 23.3.1 and 23.3.4). Nothing here hides content: server output is each scene's end
 * state, and without this script (or with reduced motion) that is what stays on screen.
 *
 * Rule scene: each flying copy is measured once against the receipt figure it leaves from (and again on resize), as CSS
 * variables; the move itself is CSS. From 1100px with scroll-driven animations the scene is tied to the scroll ("scroll"),
 * otherwise it plays once when the balance strip is whole on screen, or at once if the scene is already passed ("timed").
 * Path scene: the clause row under the screen's middle line sets which of the four states the sticky card shows. The rows
 * touch, so after any jump (PageDown, an anchor, a reload mid-page) exactly one row holds the line and reports it. The state is written
 * on the stage (data-active) and on the one field that holds it (data-on), so a change restyles those few nodes, not the section;
 * transitions start only after the first report, so a fast entry never shows the wipe from the server's state.
 */
export function HomeMotion() {
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
        const moves = [...rule.querySelectorAll<HTMLElement>("[data-fly]")].map((copy) => {
          const src = rule.querySelector<HTMLElement>(`[data-amt="${copy.dataset.fly}"] > span:last-child`);
          const cell = copy.parentElement;
          if (!src || !cell) return null;
          const s = src.getBoundingClientRect();
          const c = cell.getBoundingClientRect();
          const chip = copy.querySelector<HTMLElement>(".fly-s");
          const pad = chip ? parseFloat(getComputedStyle(chip).paddingRight) : 0;
          const scale = parseFloat(getComputedStyle(src).fontSize) / parseFloat(getComputedStyle(cell).fontSize);
          // The chip's text, not its padded box, starts exactly on the printed figure (scaled about its right edge).
          return [copy, `${s.right - c.right + pad}px`, `${s.top + s.height / 2 - (c.top + c.height / 2)}px`, String(scale)] as const;
        });
        for (const m of moves) {
          if (!m) continue;
          m[0].style.setProperty("--dx", m[1]);
          m[0].style.setProperty("--dy", m[2]);
          m[0].style.setProperty("--sc", m[3]);
        }
      };
      // Not in the hydration task: measuring there renders the page's content-visibility sections (the 4x CPU long task, YON 23.14).
      // That first pass sets the mode, so it runs when the page is idle after load, not inside a scroll frame (4x CPU: a ~100 ms
      // LoAF at the scene's approach, YON 23.17); the approach then only re-measures, which writes the copies' variables only.
      const ric = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1));
      const cic = window.cancelIdleCallback ?? clearTimeout;
      let idle = 0;
      document.fonts.ready.then(() => { idle = ric(() => { idle = 0; measure(); }, { timeout: 3000 }); });
      const near = new IntersectionObserver(([e]) => { if (e.isIntersecting || e.boundingClientRect.bottom < 0) { near.disconnect(); measure(); } }, { rootMargin: "100% 0px" });
      near.observe(rule);
      let raf = 0;
      const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
      addEventListener("resize", onResize);
      // Timed mode starts when the balance strip is whole on screen, so Onayla and "Dengede" are seen on a phone, not cut at its foot.
      // The idle and approach passes have measured; starting is play() on the paused CSS animations: no class on the scene root,
      // so no style pass over its whole subtree in a scroll frame (4x CPU: an 85 ms frame at the start, YON 23.18).
      const io = new IntersectionObserver(([e]) => {
        if (!(e.intersectionRatio >= 0.9 || e.boundingClientRect.bottom < 0)) return;
        io.disconnect();
        if (rule.dataset.mode === "timed") raf = requestAnimationFrame(() => rule.getAnimations({ subtree: true }).forEach((a) => a.play()));
      }, { threshold: [0, 0.9] });
      io.observe(rule.querySelector(".rule-close") ?? rule);
      offs.push(() => { if (idle) cic(idle); near.disconnect(); cancelAnimationFrame(raf); removeEventListener("resize", onResize); io.disconnect(); delete rule.dataset.mode; });
    }

    const path = document.querySelector<HTMLElement>(".path");
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
