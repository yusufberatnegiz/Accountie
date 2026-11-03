"use client";

import { useEffect, useRef } from "react";

/** A silent loop that plays only while on screen and never under reduced motion; otherwise the poster stays. */
export function LoopVideo({ src, poster, width, height }: { src: string; poster: string; width: number; height: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video ref={ref} muted loop playsInline preload="none" poster={poster} width={width} height={height} aria-hidden="true">
      <source src={src} type="video/webm" />
    </video>
  );
}
