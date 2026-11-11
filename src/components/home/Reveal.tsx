"use client";

import { useEffect, useRef } from "react";

/**
 * Section entrances on the homepage (landing.css). The hiding only starts once this has run (html.reveal), so a page whose
 * script never loads, or that runs without JS, shows everything settled. Sections already on screen are marked "in"
 * before the class goes on, so nothing in view blinks out; the rest get "in" when they come near the viewport.
 */
export function Reveal() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Behind the pointer, on bare ground only: a code and amount from the stage's Luca lines surfaces and fades.
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const AVOID = "a, button, label, summary, li, figure, table, dl, img, svg, header, footer, .l-plate, .l-facts, .l-rule-field, .faq-pane, .l-pick";
    const bare = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      if (!el || el.closest(AVOID)) return false;
      const block = el.closest("h1, h2, h3, p");
      if (!block) return true;
      // A text block's box can span the row; only its real lines (with a margin) count as taken.
      const r = document.createRange(); r.selectNodeContents(block);
      return ![...r.getClientRects()].some((b) => x > b.left - 24 && x < b.right + 24 && y > b.top - 24 && y < b.bottom + 24);
    };
    let fig = 0, lastX = -999, lastY = -999, lastT = 0;
    const drop = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || still.matches || !layer.current) return;
      const x = e.clientX, y = e.clientY, d = Math.hypot(x - lastX, y - lastY);
      if (d < 140) return;
      const fast = d / Math.max(1, e.timeStamp - lastT) > 1.5; // px per ms: a fling leaves nothing
      lastX = x; lastY = y; lastT = e.timeStamp;
      if (fast || layer.current.childElementCount >= 4) return;
      const figs = [...document.querySelectorAll<HTMLElement>(".l-ledger tr[data-fig]")].map((r) => r.dataset.fig!);
      if (!figs.length) return;
      // Up and left of the arrow tip, so the arrow never covers it; the whole box, with a margin, must be bare ground.
      const text = figs[fig % figs.length], w = text.length * 8 + 32, top = y - 50, left = x - 10 - w;
      if (![[left, top], [x, top], [left, y], [x, y], [left + w / 2, y - 25]].every(([px, py]) => bare(px, py))) return;
      fig++;
      const n = document.createElement("span");
      n.className = "l-num"; n.textContent = text;
      n.style.translate = `calc(${x - 10}px - 100%) ${y - 34}px`;
      n.addEventListener("animationend", () => n.remove());
      layer.current.append(n);
    };
    addEventListener("pointermove", drop);
    // The layer is fixed; a scroll would slide content under a figure, so the figures go.
    const sweep = () => layer.current?.replaceChildren();
    addEventListener("scroll", sweep, { passive: true });

    const items = [...document.querySelectorAll("[data-reveal]:not(.l-stage)")];
    const near = (el: Element) => el.getBoundingClientRect().top < innerHeight * 0.85;
    for (const el of items) if (near(el)) el.classList.add("in");
    // The stage prints its receipt when the plate itself is a third in view, not when its chip row peeks above the fold.
    let printed: ReturnType<typeof setTimeout> | undefined;
    const stage = document.querySelector(".l-stage"), plate = stage?.querySelector(".l-plate");
    const stageIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) { stage?.classList.add("in"); stageIo.disconnect(); printed = setTimeout(() => stage?.classList.add("printed"), 2400); } }, { threshold: 0.35 });
    if (plate) stageIo.observe(plate);
    document.documentElement.classList.add("reveal");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -15% 0px" });
    for (const el of items) if (!el.classList.contains("in")) io.observe(el);
    // Step cards: a soft light follows the pointer (landing.css, fine pointers only).
    const glow = (e: PointerEvent) => {
      const card = e.currentTarget as HTMLElement;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    const cards = [...document.querySelectorAll<HTMLElement>(".l-cards li")];
    const dim = (e: PointerEvent) => { const card = e.currentTarget as HTMLElement; card.style.removeProperty("--mx"); card.style.removeProperty("--my"); };
    for (const c of cards) { c.addEventListener("pointermove", glow); c.addEventListener("pointerleave", dim); }
    return () => { removeEventListener("pointermove", drop); removeEventListener("scroll", sweep); clearTimeout(printed); io.disconnect(); stageIo.disconnect(); for (const c of cards) { c.removeEventListener("pointermove", glow); c.removeEventListener("pointerleave", dim); } };
  }, []);
  return <div className="l-nums" ref={layer} aria-hidden="true" />;
}
