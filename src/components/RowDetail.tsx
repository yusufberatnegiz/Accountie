"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

// A drawer's curve: it leaves the row at once but keeps moving long enough for the eye to see the rows below being pushed down.
const DRAWER = "cubic-bezier(0.2, 0, 0, 1)";
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A receipt opened under its row. It unrolls from the row: the part that will be on screen grows from nothing (the rest is off screen
 * anyway), pushing the rows below down, the screen inside sliding with its edge. Closing (the open row, Kapat) rolls it back up first and
 * then goes to the list. Its row comes into view when it moved off screen (the next draft after an approval), and focus goes to its link.
 */
export function RowDetail({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Before the first paint, so the screen never shows at full height for a frame first.
  useLayoutEffect(() => {
    const el = ref.current;
    // A hidden tab holds animations still: there the screen just opens.
    if (!el || still() || document.hidden) return;
    const top = el.getBoundingClientRect().top;
    // A row off screen is scrolled to next (below): then only part of a screen will show.
    const shown = top < 0 || top > innerHeight ? innerHeight * 0.6 : innerHeight - top + 48;
    const target = Math.min(el.scrollHeight, Math.max(0, shown));
    const duration = Math.min(360, 240 + target / 6);
    // No fill: once it ends the height is the content's own again; the rest of the way is off screen.
    el.animate([{ height: "0px", overflow: "hidden" }, { height: `${target}px`, overflow: "hidden" }], { duration, easing: DRAWER });
    el.firstElementChild?.animate([{ opacity: 0, transform: "translateY(-24px)" }, { opacity: 1, transform: "none" }], { duration: duration * 0.7, easing: DRAWER });
  }, [id]);
  useEffect(() => {
    const row = ref.current?.closest("tr")?.previousElementSibling ?? ref.current;
    if (!row) return;
    const top = row.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.6) row.scrollIntoView({ block: "start", behavior: still() ? "auto" : "smooth" });
    if (!ref.current?.contains(document.activeElement)) row.querySelector<HTMLElement>(".row-link")?.focus({ preventScroll: true });
  }, [id]);
  // Closing rolls the screen back up, then goes to the list. After the unsaved-edit question (which may stop the click first).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = ref.current;
      if (!el || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || still()) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      const row = el.closest("tr")?.previousElementSibling;
      const closes = a && ((row?.contains(a) && a.matches(".row-link")) || (el.contains(a) && a.matches(".bar-back")));
      if (!closes) return;
      e.preventDefault();
      e.stopPropagation();
      if (el.dataset.closing) return;
      el.dataset.closing = "";
      // Closed from its foot (Kapat under a long receipt) its row is above the screen: the row comes back first, so the screen rolls
      // up under it and the user stays beside the row they closed.
      if (row && row.getBoundingClientRect().top < 0) row.scrollIntoView({ block: "start" });
      // The row reads as closed at once, the arrow back to the side, whatever the list takes to arrive.
      row?.removeAttribute("data-open");
      row?.querySelector(".row-link")?.setAttribute("aria-expanded", "false");
      // Focus goes back to the row it was opened from, which stays on the page.
      row?.querySelector<HTMLElement>(".row-link")?.focus({ preventScroll: true });
      const vis = Math.min(el.offsetHeight, Math.max(0, innerHeight - el.getBoundingClientRect().top));
      // The part off screen drops at once (unseen); the visible part rolls up, quicker than it opened.
      el.style.height = `${vis}px`;
      el.style.overflow = "hidden";
      // fill forwards: held shut until the list arrives without it, so no full-height frame slips in between.
      el.animate([{ height: `${vis}px` }, { height: "0px" }], { duration: 200, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
      // A background tab holds animations still: the list follows after the 200ms either way.
      setTimeout(() => router.replace(a.getAttribute("href")!, { scroll: false }), 220);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
  return <div ref={ref} id={`fis-detay-${id}`} className="row-detail-roll">{children}</div>;
}
