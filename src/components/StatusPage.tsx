import type { ReactNode } from "react";
import { Brand, BrandMark } from "@/components/BrandMark";
import { ThemeCycle } from "@/components/ThemeSwitch";

/**
 * Error and not-found screens, laid out like the auth screens: top bar (wordmark home, the one theme button the public bar uses), the message on the
 * wordmark's left edge and vertically centred; the right half is the stage with the receipt-strip mark drawn large.
 */
export function StatusPage({ title, children, actions, alert = false }: { title: string; children: ReactNode; actions: ReactNode; alert?: boolean }) {
  return (
    <div className="status-page">
      <div className="status-side">
      <header className="status-top">
        <Brand href="/" />
        <ThemeCycle />
      </header>
      <main id="icerik" tabIndex={-1} className="status-body">
        <section className="status-message" role={alert ? "alert" : undefined} aria-labelledby="status-title">
          <h1 id="status-title">{title}</h1>
          {children}
          <div className="actions">{actions}</div>
        </section>
      </main>
      </div>
      <div className="status-stage" aria-hidden="true"><BrandMark className="status-mark" /></div>
    </div>
  );
}
