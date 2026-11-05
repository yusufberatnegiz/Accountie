"use client";

import { useEffect } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The homepage's two scroll scenes (YON.md 23.3.1 and 23.3.4). Nothing here hides content: server output is each scene's end
 * state, and without this script (or with reduced motion) that is what stays on screen.
 *
 * Rule scene: each flying copy is measured once against the receipt figure it leaves from (and again on resize), as CSS
 * variables; the move itself is CSS. From 1100px with scroll-driven animations the scene is tied to the scroll ("scroll"),
 * otherwise it plays once when a third of the balance strip is on screen, or at once if the scene is already passed ("timed").
 * Path scene: the clause row under the screen's middle line sets which of the four states the sticky card shows. The rows
 * touch, so after any jump (PageDown, an anchor, a reload mid-page) exactly one row holds the line and reports it.
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
          const chip = copy.querySelector<HTMLElement>(".fly-s");
          const pad = chip ? parseFloat(getComputedStyle(chip).paddingRight) : 0;
          const scale = parseFloat(getComputedStyle(src).fontSize) / parseFloat(getComputedStyle(cell).fontSize);
          // The chip's text, not its padded box, starts exactly on the printed figure (scaled about its right edge).
          copy.style.setProperty("--dx", `${s.right - c.right + pad}px`);
          copy.style.setProperty("--dy", `${s.top + s.height / 2 - (c.top + c.height / 2)}px`);
          copy.style.setProperty("--sc", String(scale));
        }
      };
      // First measure only when the scene is a screen away: measuring a content-visibility section at load renders it in the
      // hydration task (the 4x CPU long task, YON 23.14).
      const near = new IntersectionObserver(([e]) => { if (e.isIntersecting || e.boundingClientRect.bottom < 0) { near.disconnect(); measure(); } }, { rootMargin: "100% 0px" });
      near.observe(rule);
      let raf = 0;
      const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
      addEventListener("resize", onResize);
      // Timed mode starts when the balance strip is a third on screen, so the landings and "Dengede" are seen on a phone too.
      // Re-measure once the section is rendered (content-visibility), then start a frame later: reads, writes and the start of
      // the flight land in separate frames instead of one long one (YON 23.11).
      const io = new IntersectionObserver(([e]) => {
        if (!(e.intersectionRatio >= 0.34 || e.boundingClientRect.bottom < 0)) return;
        io.disconnect();
        raf = requestAnimationFrame(() => { measure(); raf = requestAnimationFrame(() => rule.classList.add("is-playing")); });
      }, { threshold: [0, 0.34] });
      io.observe(rule.querySelector(".rule-close") ?? rule);
      offs.push(() => { near.disconnect(); cancelAnimationFrame(raf); removeEventListener("resize", onResize); io.disconnect(); delete rule.dataset.mode; });
    }

    const path = document.querySelector<HTMLElement>(".path");
    if (path) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const n = (e.target.parentElement as HTMLElement).dataset.n ?? "1";
          if (e.isIntersecting && path.dataset.active !== n) path.dataset.active = n;
        }
      }, { rootMargin: "-50% 0px -50% 0px" });
      path.querySelectorAll(".path-clause").forEach((c) => io.observe(c));
      offs.push(() => io.disconnect());
    }

    return () => offs.forEach((f) => f());
  }, []);
  return null;
}
