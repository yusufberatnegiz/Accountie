import Link from "next/link";
import type { ReactNode } from "react";
import { syncSources } from "@/app/actions/sync";
import { logout } from "@/app/giris/actions";
import { loadSourceHealth } from "@/lib/office-data";
import { AppNavigation } from "./app-navigation";

export async function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const health = await loadSourceHealth();
  const healthLabel = health.total === 0 ? "Kaynak yok" : health.healthy === health.total ? `${health.total}/${health.total} kaynak güncel` : `${health.healthy}/${health.total} kaynak güncel`;
  return (
    <div className="app">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span><span className="brand-text">Accountie</span>
        </Link>
        <AppNavigation />
        <div className="sidebar-footer">
          <form action={logout}><button className="logout-button" type="submit"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8" /></svg><span>Çıkış yap</span></button></form>
          <div className="sidebar-meta">Accountie MVP<br />Ofis içi kullanım</div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-actions">
            <div className="source-health" title={health.rows.map((row) => `${row.name}: ${row.lastSuccessAt ? "kontrol edildi" : "bekliyor"}`).join("\n")}>
              <span className={`health-dot${health.healthy < health.total ? " health-warning" : ""}`} /><span>{healthLabel}</span>
            </div>
            <form action={syncSources}><button className="button scan-button" type="submit"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6" /></svg><span>Şimdi tara</span></button></form>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
