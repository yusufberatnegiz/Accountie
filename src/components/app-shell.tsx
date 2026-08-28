import Link from "next/link";
import type { ReactNode } from "react";
import { syncSources } from "@/app/actions/sync";
import { logout } from "@/app/giris/actions";
import { loadSourceHealth } from "@/lib/office-data";

const primaryNav = [
  ["▦", "Ana sayfa", "/"],
  ["▣", "Beyan & Ödeme", "/takvim"],
  ["◫", "Güncel mevzuat", "/guncel-akis"],
] as const;
const officeNav = [
  ["✎", "Notlar", "/notlar"],
  ["★", "Favoriler", "/favoriler"],
] as const;

export async function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const health = await loadSourceHealth();
  const healthLabel = health.total === 0 ? "Kaynak yok" : health.healthy === health.total ? `${health.total}/${health.total} kaynak güncel` : `${health.healthy}/${health.total} kaynak güncel`;
  return (
    <div className="app">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span><span>Accountie</span>
        </Link>
        <nav aria-label="Ana menü">
          <div className="nav-group">
            <div className="nav-label">Günlük ofis takibi</div>
            {primaryNav.map(([icon, label, href]) => (
              <Link className="nav-link" href={href} key={href}>
                <span className="nav-icon">{icon}</span><span>{label}</span>
              </Link>
            ))}
          </div>
          <div className="nav-group">
            <div className="nav-label">Ofis araçları</div>
            {officeNav.map(([icon, label, href]) => (
              <Link className="nav-link" href={href} key={href}>
                <span className="nav-icon">{icon}</span><span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="sidebar-footer">
          <form action={logout}><button className="logout-button" type="submit">Çıkış yap</button></form>
          Accountie MVP<br />Ofis içi kullanım
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-actions">
            <div className="source-health" title={health.rows.map((row) => `${row.name}: ${row.lastSuccessAt ? "kontrol edildi" : "bekliyor"}`).join("\n")}>
              <span className={`health-dot${health.healthy < health.total ? " health-warning" : ""}`} /><span>{healthLabel}</span>
            </div>
            <form action={syncSources}><button className="button scan-button" type="submit">↻ Şimdi tara</button></form>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
