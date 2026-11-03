import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SiteBar } from "@/components/site/SiteBar";

/**
 * Error and not-found screens, laid out like the auth screens: the public SiteBar across the top, the message on the bar's
 * left edge and vertically centred; the right side is the split tone with the receipt-strip mark drawn large.
 */
export function StatusPage({ title, children, actions, alert = false }: { title: string; children: ReactNode; actions: ReactNode; alert?: boolean }) {
  return (
    <div className="status-page">
      <SiteBar />
      <main id="icerik" tabIndex={-1} className="status-body">
        <section className="status-message" role={alert ? "alert" : undefined} aria-labelledby="status-title">
          <h1 id="status-title">{title}</h1>
          {children}
          <div className="actions">{actions}</div>
        </section>
      </main>
      <div className="status-stage" aria-hidden="true"><BrandMark className="status-mark" /></div>
    </div>
  );
}
