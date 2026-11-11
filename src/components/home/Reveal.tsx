"use client";

import { useEffect, useRef } from "react";

/**
 * Section entrances on the homepage (landing.css). The hiding only starts once this has run (html.reveal), so a page whose
 * script never loads, or that runs without JS, shows everything settled. Sections already on screen are marked "in"
 * before the class goes on, so nothing in view blinks out; the rest get "in" when they come near the viewport.
 */
export function Reveal() {
  const light = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The amber light trails the pointer; with reduced motion it jumps instead of gliding.
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = 0, y = 0, tx = 0, ty = 0, frame = 0;
    const draw = () => {
      x += (tx - x) * (still ? 1 : 0.18); y += (ty - y) * (still ? 1 : 0.18);
      if (light.current) light.current.style.transform = `translate(${x}px, ${y}px)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(draw) : 0;
    };
    const follow = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!light.current?.classList.contains("on")) { x = tx = e.clientX; y = ty = e.clientY; light.current?.classList.add("on"); }
      tx = e.clientX; ty = e.clientY;
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const hide = () => light.current?.classList.remove("on");
    addEventListener("pointermove", follow);
    document.documentElement.addEventListener("pointerleave", hide);

    const items = [...document.querySelectorAll("[data-reveal]:not(.l-stage)")];
    const near = (el: Element) => el.getBoundingClientRect().top < innerHeight * 0.85;
    for (const el of items) if (near(el)) el.classList.add("in");
    // The stage prints its receipt when the plate itself is a third in view, not when its chip row peeks above the fold.
    const stage = document.querySelector(".l-stage"), plate = stage?.querySelector(".l-plate");
    const stageIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) { stage?.classList.add("in"); stageIo.disconnect(); } }, { threshold: 0.35 });
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
    return () => { removeEventListener("pointermove", follow); document.documentElement.removeEventListener("pointerleave", hide); cancelAnimationFrame(frame); io.disconnect(); stageIo.disconnect(); for (const c of cards) { c.removeEventListener("pointermove", glow); c.removeEventListener("pointerleave", dim); } };
  }, []);
  return <div className="l-glow" ref={light} aria-hidden="true" />;
}
