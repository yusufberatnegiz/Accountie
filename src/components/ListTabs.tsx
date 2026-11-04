"use client";

import Link from "next/link";
import { useOptimistic, useTransition, ViewTransition } from "react";
import { Odometer } from "./home/Odometer";

type Tab = { slug: string; label: string; href: string; count: number };

/**
 * Status tabs of the receipt list. The underline slides to the chosen tab (a shared view transition),
 * and a count that changes after an upload or a Luca download rolls to its new figure.
 */
export function ListTabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  const [shown, setShown] = useOptimistic(active);
  const [, startTransition] = useTransition();
  return (
    <nav className="tabs" aria-label="Fiş durumu">
      {tabs.map((t) => (
        <Link key={t.slug} href={t.href} scroll={false} aria-current={shown === t.slug ? "page" : undefined}
          onNavigate={() => startTransition(() => setShown(t.slug))}>
          {t.label}{" "}
          <Odometer value={String(t.count)} className="tab-count" />
          {/* Keyed to the committed tab so the line lands where the navigation settles. */}
          {active === t.slug ? (
            <ViewTransition name="sekme-cizgisi" share="tab-slide" default="none">
              <span className="tab-line" aria-hidden="true" />
            </ViewTransition>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
