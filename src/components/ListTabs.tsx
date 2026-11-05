"use client";

import Link from "next/link";
import { useOptimistic, useRef, useTransition, ViewTransition } from "react";
import { moveOnly } from "@/lib/view-transition";
import { Odometer } from "./home/Odometer";

type Tab = { slug: string; label: string; href: string; count: number };

/**
 * Status tabs of the receipt list. The underline slides to the chosen tab (a shared view transition),
 * and a count that changes after an upload or a Luca download rolls to its new figure. The "sekme" type lets the rows
 * that leave the filter go out and the ones that join it rise in (ReceiptListView).
 */
export function ListTabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  const [shown, setShown] = useOptimistic(active);
  const [, startTransition] = useTransition();
  const line = useRef<HTMLSpanElement>(null);
  return (
    <nav className="tabs" aria-label="Fiş durumu">
      {tabs.map((t) => (
        <Link key={t.slug} href={t.href} scroll={false} transitionTypes={["sekme"]} aria-current={shown === t.slug ? "page" : undefined}
          onNavigate={() => startTransition(() => setShown(t.slug))}>
          {t.label}{" "}
          <Odometer value={String(t.count)} className="tab-count" />
          {/* Keyed to the committed tab so the line lands where the navigation settles. */}
          {active === t.slug ? (
            // The tabs differ in width: the line's resize becomes a scale, so it slides by transform alone.
            <ViewTransition name="sekme-cizgisi" share="tab-slide" default="none" onShare={(i) => moveOnly(i, line.current)}>
              <span ref={line} className="tab-line" aria-hidden="true" />
            </ViewTransition>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
