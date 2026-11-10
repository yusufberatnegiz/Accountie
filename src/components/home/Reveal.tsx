"use client";

import { useEffect } from "react";

/**
 * Section entrances on the homepage (landing.css). The hiding only starts once this has run (html.reveal), so a page whose
 * script never loads, or that runs without JS, shows everything settled. Sections already on screen are marked "in"
 * before the class goes on, so nothing in view blinks out; the rest get "in" when they come near the viewport.
 */
export function Reveal() {
  useEffect(() => {
    const items = [...document.querySelectorAll("[data-reveal]")];
    const near = (el: Element) => el.getBoundingClientRect().top < innerHeight * 0.85;
    for (const el of items) if (near(el)) el.classList.add("in");
    document.documentElement.classList.add("reveal");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -15% 0px" });
    for (const el of items) if (!el.classList.contains("in")) io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}
