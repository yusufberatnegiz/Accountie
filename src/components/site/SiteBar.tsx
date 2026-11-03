import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ThemeCycle } from "@/components/ThemeSwitch";
import { SiteMenu } from "./SiteMenu";
import "./site.css";

const LINKS = [
  { href: "/#path-title", label: "Nasıl çalışır" },
  { href: "/#show-title", label: "Kontrol ekranı" },
  { href: "/#sss", label: "SSS" },
];

/**
 * The public top bar (docs/design/YON.md 14.1): detached, sticky, one row. Brand, the page's sections, the theme button,
 * Giriş yap and the one accent action. Outside <main>, so the skip link jumps past it. Below 960px (where all of it no longer
 * fits on one row) the section links go into a menu; on phones the bar keeps the name, the theme, Giriş yap and the menu.
 * The dock has no height, so the hero's two tones run up to the top edge under the bar.
 */
export function SiteBar({ current }: { current?: "giris" | "kayit" }) {
  return (
    <div className="site-dock">
      <header className="site-bar">
        <Link className="brand site-brand" href="/" translate="no"><BrandMark />Accountie</Link>
        <nav className="site-links" aria-label="Bölümler">
          {LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        <div className="site-actions">
          <ThemeCycle />
          {current === "giris" ? null : <Link className="btn site-login" href="/giris">Giriş yap</Link>}
          {/* On the auth screens the form's own button is the one accent action. */}
          {current === "kayit" ? null : <Link className={current ? "btn site-cta" : "btn btn-accent site-cta"} href="/kayit">Hesap oluştur</Link>}
          <SiteMenu links={[...LINKS, ...(current === "kayit" ? [] : [{ href: "/kayit", label: "Hesap oluştur" }])]} />
        </div>
      </header>
    </div>
  );
}
