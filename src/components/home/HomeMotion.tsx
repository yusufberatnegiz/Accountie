"use client";

import { useEffect } from "react";

/** Resolves when the frame's picture is decoded, or after 600ms: the frame is 86% open meanwhile, so waiting longer only delays. */
function pictureReady(el: HTMLElement): Promise<void> {
  const img = el.querySelector("img");
  if (!img || (img.complete && img.naturalWidth > 0)) return Promise.resolve();
  return Promise.race([img.decode().catch(() => {}), new Promise<void>((r) => setTimeout(r, 600))]);
}

/**
 * Section entrances, once (taste-skill motion.md "Reveal on scroll"). The hiding class is added here, after hydration,
 * so if this script never runs nothing stays hidden. What is already on screen (a deep link, a reload mid-page) is marked
 * as arrived before the class goes on, so it never jumps back to its start and in again. Reduced motion: CSS keeps only the end state.
 */
export function HomeMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (!("IntersectionObserver" in window)) return;
    const arrive = (el: HTMLElement) => {
      if (el.dataset.reveal === "shutter") pictureReady(el).then(() => el.classList.add("is-in"));
      else el.classList.add("is-in");
    };
    const pending = els.filter((el) => {
      const r = el.getBoundingClientRect();
      const inView = r.top < window.innerHeight && r.bottom > 0;
      if (inView && el.dataset.reveal !== "shutter") el.classList.add("is-in");
      return !inView || el.dataset.reveal === "shutter";
    });
    root.classList.add("motion");
    const watch = (opts: IntersectionObserverInit) => {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { arrive(e.target as HTMLElement); io.unobserve(e.target); }
      }, opts);
      return io;
    };
    // "Bir fişin yolu" plays its acts once a third of the field is on screen (YON.md 16.4); everything else as it enters.
    const fields = watch({ threshold: 0.35 });
    const rest = watch({ threshold: 0 });
    pending.forEach((el) => (el.classList.contains("path-field") ? fields : rest).observe(el));
    return () => { fields.disconnect(); rest.disconnect(); root.classList.remove("motion"); };
  }, []);
  return null;
}
