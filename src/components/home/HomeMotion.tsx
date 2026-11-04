"use client";

import { useEffect } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The homepage's two scroll scenes (YON.md 23.3.1 and 23.3.4). Nothing here hides content: server output is each scene's end
 * state, and without this script (or with reduced motion) that is what stays on screen.
 *
 * Rule scene: each flying copy is measured once against the receipt figure it leaves from (and again on resize), as CSS
 * variables; the move itself is CSS. From 1100px with scroll-driven animations the scene is tied to the scroll ("scroll"),
 * otherwise it plays once when a third of it is on screen ("timed").
 * Path scene: the clause in the middle band of the screen sets which of the four states the sticky card shows.
 */
export function HomeMotion() {
  useEffect(() => {
    if (reduced() || !("IntersectionObserver" in window)) return;
    const offs: (() => void)[] = [];

    const rule = document.querySelector<HTMLElement>('[data-scene="rule"]');
    if (rule) {
      const measure = () => {
        const wide = matchMedia("(min-width: 1100px)").matches && CSS.supports("animation-timeline: view()");
        rule.dataset.mode = wide ? "scroll" : "timed";
        for (const copy of rule.querySelectorAll<HTMLElement>("[data-fly]")) {
          const src = rule.querySelector<HTMLElement>(`[data-amt="${copy.dataset.fly}"] > span:last-child`);
          const cell = copy.parentElement;
          if (!src || !cell) continue;
          const s = src.getBoundingClientRect();
          const c = cell.getBoundingClientRect();
          const scale = parseFloat(getComputedStyle(src).fontSize) / parseFloat(getComputedStyle(cell).fontSize);
          copy.style.setProperty("--dx", `${s.right - c.right}px`);
          copy.style.setProperty("--dy", `${s.top + s.height / 2 - (c.top + c.height / 2)}px`);
          copy.style.setProperty("--sc", String(scale));
        }
      };
      measure();
      let raf = 0;
      const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
      addEventListener("resize", onResize);
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { rule.classList.add("is-playing"); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(rule.querySelector(".rule-win") ?? rule);
      offs.push(() => { removeEventListener("resize", onResize); io.disconnect(); delete rule.dataset.mode; });
    }

    const path = document.querySelector<HTMLElement>(".path");
    if (path) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) path.dataset.active = (e.target.parentElement as HTMLElement).dataset.n ?? "1";
        }
      }, { rootMargin: "-45% 0px -45% 0px" });
      path.querySelectorAll(".path-clause").forEach((c) => io.observe(c));
      offs.push(() => io.disconnect());
    }

    return () => offs.forEach((f) => f());
  }, []);
  return null;
}
