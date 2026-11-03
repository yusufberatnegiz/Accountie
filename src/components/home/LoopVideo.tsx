"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A silent loop that plays only while on screen and never by itself under reduced motion; otherwise the poster stays.
 * The poster is the frame's background and the video stays transparent until it plays, so the box is never black.
 * The button stops or starts it (WCAG 2.2.2: motion longer than 5 s next to other content can be paused).
 */
export function LoopVideo({ src, poster, width, height }: { src: { mp4: string; webm: string }; poster: string; width: number; height: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const stoppedByUser = useRef(false);
  const [playing, setPlaying] = useState(false);
  // Set on the first painted frame (playing), not on play(): until then the poster shows through.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !stoppedByUser.current) v.play().catch(() => {});
      else if (!e.isIntersecting) v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    stoppedByUser.current = playing;
    if (playing) v.pause();
    else v.play().catch(() => {});
  };

  return (
    <div className="loop-video" data-shown={shown || undefined} style={{ backgroundImage: `url(${poster})` }}>
      <video ref={ref} muted loop playsInline preload="none" poster={poster} width={width} height={height} aria-hidden="true"
        onPlay={() => setPlaying(true)} onPlaying={() => setShown(true)} onPause={() => setPlaying(false)}>
        <source src={src.mp4} type="video/mp4" />
        <source src={src.webm} type="video/webm" />
      </video>
      <button type="button" className="btn loop-video-btn" onClick={toggle}>{playing ? "Videoyu durdur" : "Videoyu oynat"}</button>
    </div>
  );
}
