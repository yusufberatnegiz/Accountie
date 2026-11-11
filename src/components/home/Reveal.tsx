"use client";

import { useEffect, useRef } from "react";

/**
 * Section entrances on the homepage (landing.css). The hiding only starts once this has run (html.reveal), so a page whose
 * script never loads, or that runs without JS, shows everything settled. Sections already on screen are marked "in"
 * before the class goes on, so nothing in view blinks out; the rest get "in" when they come near the viewport.
 */
export function Reveal() {
  const dots = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Thermal dots: where the mouse passes, a grid of heat-print dots on the bare ground warms up and cools down.
    // The canvas sits under the sections (z-index -1), so cards and plates cover it. No dots with reduced motion.
    const canvas = dots.current, g = canvas?.getContext("2d");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const STEP = 16, REACH = 88;
    const heat = new Map<number, number>(); // key: column * 10000 + row
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    let x = 0, y = 0, frame = 0, last = 0;
    const size = () => { if (canvas && fine) { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; } };
    const draw = (now: number) => {
      frame = 0;
      if (!canvas || !g) return;
      // Cooling by time, not by frame: the trail lasts about as long on a 60 Hz and a 144 Hz screen.
      const cool = Math.min(0.1, (now - last) / 650), d = devicePixelRatio;
      last = now;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = getComputedStyle(canvas).color; // the theme's accent, so a theme switch mid-trail recolours it
      for (const [key, h] of heat) {
        const col = Math.round(key / 10000), row = key - col * 10000;
        g.globalAlpha = h * 0.6;
        g.beginPath(); g.arc(col * STEP * d, row * STEP * d, (0.9 + h * 1.3) * d, 0, Math.PI * 2); g.fill();
        if (h <= cool) heat.delete(key); else heat.set(key, h - cool);
      }
      if (heat.size) frame = requestAnimationFrame(draw);
    };
    const warm = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || still.matches) return;
      x = e.clientX; y = e.clientY;
      for (let col = Math.ceil((x - REACH) / STEP); col * STEP <= x + REACH; col++) for (let row = Math.ceil((y - REACH) / STEP); row * STEP <= y + REACH; row++) {
        const near = 1 - Math.hypot(col * STEP - x, row * STEP - y) / REACH, key = col * 10000 + row;
        if (near > 0) heat.set(key, Math.max(heat.get(key) ?? 0, near));
      }
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(draw); }
    };
    // The canvas is fixed; on scroll the content moves and the trail would stay, so it goes.
    const sweep = () => { if (heat.size) { heat.clear(); g?.clearRect(0, 0, canvas!.width, canvas!.height); } };
    size();
    if (fine) addEventListener("pointermove", warm);
    addEventListener("scroll", sweep, { passive: true });
    addEventListener("resize", size);

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
    return () => { removeEventListener("pointermove", warm); removeEventListener("scroll", sweep); removeEventListener("resize", size); cancelAnimationFrame(frame); clearTimeout(printed); io.disconnect(); stageIo.disconnect(); for (const c of cards) { c.removeEventListener("pointermove", glow); c.removeEventListener("pointerleave", dim); } };
  }, []);
  return <canvas className="l-dots" ref={dots} aria-hidden="true" />;
}
