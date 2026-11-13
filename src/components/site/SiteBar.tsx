import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ThemeCycle } from "@/components/ThemeSwitch";
import { SiteMenu } from "./SiteMenu";
import "./site.css";

const LINKS = [
  { href: "/#path-title", label: "Nasıl çalışır" },
  { href: "/#kural", label: "Denge kuralı" },
  { href: "/#sss", label: "SSS" },
  { href: "/fiyatlar", label: "Fiyatlar" },
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
        <Link className="brand site-brand" href="/" prefetch={false} translate="no"><BrandMark />Accountie</Link>
        <nav className="site-links" aria-label="Bölümler">
          {LINKS.map((l) => <Link key={l.href} href={l.href} prefetch={false}>{l.label}</Link>)}
        </nav>
        <div className="site-actions">
          <ThemeCycle />
          {/* A full page load: the login pages' CSP lets Turnstile load, this page's does not, and a client navigation keeps this page's. */}
          {current === "giris" ? null : <a className="btn site-login" href="/giris">Giriş yap</a>}
          {/* On the auth screens the form’s own button is the one primary action. */}
          {current === "kayit" ? null : <a className={current ? "btn site-cta" : "btn btn-primary site-cta"} href="/kayit">Hesap oluştur</a>}
          <SiteMenu links={[...LINKS, ...(current === "kayit" ? [] : [{ href: "/kayit", label: "Hesap oluştur" }])]} />
        </div>
      </header>
    </div>
  );
}
