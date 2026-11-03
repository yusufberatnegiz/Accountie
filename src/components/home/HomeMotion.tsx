"use client";

import { useEffect } from "react";

/**
 * Section entrances, once (taste-skill motion.md "Reveal on scroll"). The hiding class is added here, after hydration,
 * so if this script never runs nothing stays hidden. Reduced motion: CSS keeps only the opacity change.
 */
export function HomeMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (!("IntersectionObserver" in window)) return;
    root.classList.add("motion");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px", threshold: 0 });
    els.forEach((el) => io.observe(el));
    return () => { io.disconnect(); root.classList.remove("motion"); };
  }, []);
  return null;
}
