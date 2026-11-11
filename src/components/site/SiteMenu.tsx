"use client";

import { useEffect, useRef } from "react";

/** The bar's links on narrow screens: a native disclosure, closed by Esc (focus back on the button), an outside click, focus leaving it or a chosen link. */
export function SiteMenu({ links }: { links: { href: string; label: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        d.open = false;
        d.querySelector("summary")?.focus();
      } else if (!d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, []);
  return (
    <details className="site-menu" ref={ref}
      // No relatedTarget is a click on the panel itself or a window switch; the outside-click handler covers clicks.
      onBlur={(e) => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false; }}>
      <summary aria-label="Menü">
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>
      </summary>
      <nav className="site-menu-list" aria-label="Menü">
        {/* Plain links: /giris and /kayit need a full load for their own CSP (Turnstile); the rest are anchors on the homepage. */}
        {links.map((l) => <a key={l.href} href={l.href} onClick={() => { if (ref.current) ref.current.open = false; }}>{l.label}</a>)}
      </nav>
    </details>
  );
}
