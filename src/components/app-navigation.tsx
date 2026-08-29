"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "calendar" | "updates" | "gazette" | "notes" | "star";

const groups: Array<{ label: string; items: Array<{ icon: IconName; label: string; href: string }> }> = [
  {
    label: "Günlük ofis takibi",
    items: [
      { icon: "home", label: "Ana sayfa", href: "/" },
      { icon: "calendar", label: "Beyan & Ödeme", href: "/takvim" },
      { icon: "updates", label: "Güncel mevzuat", href: "/guncel-akis" },
      { icon: "gazette", label: "Resmî Gazete", href: "/resmi-gazete" },
    ],
  },
  {
    label: "Ofis araçları",
    items: [
      { icon: "notes", label: "Notlar", href: "/notlar" },
      { icon: "star", label: "Favoriler", href: "/favoriler" },
    ],
  },
];

function NavIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8 };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" {...common}>
      {name === "home" ? <><rect height="7" rx="1" width="7" x="3" y="3" /><rect height="7" rx="1" width="7" x="14" y="3" /><rect height="7" rx="1" width="7" x="3" y="14" /><rect height="7" rx="1" width="7" x="14" y="14" /></> : null}
      {name === "calendar" ? <><rect height="18" rx="2" width="18" x="3" y="4" /><path d="M8 2v4M16 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" /></> : null}
      {name === "updates" ? <><rect height="17" rx="2" width="15" x="6" y="4" /><path d="M9 8h8M9 12h8M9 16h5M3 7v12a2 2 0 0 0 2 2h12" /></> : null}
      {name === "gazette" ? <><rect height="18" rx="2" width="17" x="3.5" y="3" /><path d="M7 7h4v4H7zM14 7h3M14 10h3M7 14h10M7 17h10" /></> : null}
      {name === "notes" ? <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></> : null}
      {name === "star" ? <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" /> : null}
    </svg>
  );
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Ana menü" className="app-navigation">
      {groups.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          <div className="nav-items">
            {group.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link aria-current={active ? "page" : undefined} className={`nav-link${active ? " active" : ""}`} href={item.href} key={item.href}>
                  <span className="nav-icon"><NavIcon name={item.icon} /></span>
                  <span className="nav-text">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
