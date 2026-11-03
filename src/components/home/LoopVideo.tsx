"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A silent loop that plays only while on screen and never by itself under reduced motion; otherwise the poster stays.
 * The poster is also the video's background, so the frame is never black while the first frame loads.
 * The button stops or starts it (WCAG 2.2.2: motion longer than 5 s next to other content can be paused).
 */
export function LoopVideo({ src, poster, width, height }: { src: { mp4: string; webm: string }; poster: string; width: number; height: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const stoppedByUser = useRef(false);
  const [playing, setPlaying] = useState(false);

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
    <div className="loop-video">
      <video ref={ref} muted loop playsInline preload="none" poster={poster} width={width} height={height} aria-hidden="true"
        style={{ backgroundImage: `url(${poster})` }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
        <source src={src.mp4} type="video/mp4" />
        <source src={src.webm} type="video/webm" />
      </video>
      <button type="button" className="btn loop-video-btn" onClick={toggle}>{playing ? "Videoyu durdur" : "Videoyu oynat"}</button>
    </div>
  );
}
