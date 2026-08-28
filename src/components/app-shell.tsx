import Link from "next/link";
import type { ReactNode } from "react";

const primaryNav = [
  ["▦", "Ana sayfa", "/"],
  ["▣", "Beyan & Ödeme", "/takvim"],
  ["◫", "Güncel mevzuat", "/guncel-akis"],
] as const;
const officeNav = [
  ["✎", "Notlar", "/notlar"],
  ["★", "Favoriler", "/favoriler"],
  ["⚙", "Kaynak yönetimi", "/yonetim"],
] as const;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
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
        <div className="sidebar-footer">Accountie MVP<br />Ofis içi kullanım</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="source-health"><span className="health-dot" /><span>Yalnızca resmî kaynaklar</span></div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
