import type { ViewTransitionInstance } from "react";

type Frame = Keyframe & { width?: string; height?: string; transform?: string };

/**
 * The browser's own group keyframes move a view-transition group by transform and also resize it (width, height).
 * This keeps the move as transform alone: the size is dropped (the group sits at its new size from the first frame),
 * or, given the new size, turned into a scale from the group's top-left corner (needs `transform-origin: 0 0` on the group).
 */
export function transformOnly(frames: Frame[], to?: { width: number; height: number }): Frame[] {
  return frames.map(({ width, height, ...f }) => {
    if (!to || width === undefined || height === undefined || !to.width || !to.height) return f;
    const sx = parseFloat(width) / to.width, sy = parseFloat(height) / to.height;
    return { ...f, transform: `${f.transform && f.transform !== "none" ? f.transform : ""} scale(${sx}, ${sy})`.trim() };
  });
}

/** Rewrites a React <ViewTransition>'s group animation with transformOnly; `el` (the new element) turns the resize into a scale. */
export function moveOnly(instance: ViewTransitionInstance, el?: Element | null) {
  // React 19.2 passes the group pseudo-element on the instance; the public type does not list it yet.
  const group = (instance as ViewTransitionInstance & { group?: { getAnimations(): Animation[] } }).group;
  const box = el?.getBoundingClientRect();
  for (const a of group?.getAnimations() ?? []) {
    if (!(a.effect instanceof KeyframeEffect)) continue;
    const frames = a.effect.getKeyframes() as Frame[];
    // Already rewritten (both ends of a shared pair call this), or not a size-carrying group animation.
    if (!frames.some((f) => f.width !== undefined || f.height !== undefined)) continue;
    a.effect.setKeyframes(transformOnly(frames, box));
  }
}
