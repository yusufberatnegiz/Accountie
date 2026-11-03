import Link from "next/link";
import { logout } from "@/app/giris/actions";
import { Brand } from "@/components/BrandMark";
import { ThemeSwitch } from "@/components/ThemeSwitch";

export function AppHeader({ current }: { current: "fisler" | "kurallar" }) {
  return (
    <header className="topbar">
      <Brand href="/" />
      <div className="topbar-end">
        <nav className="nav" aria-label="Ana menü">
          <Link href="/" aria-current={current === "fisler" ? "page" : undefined}>Fişler</Link>
          <Link href="/kurallar" aria-current={current === "kurallar" ? "page" : undefined}>Kurallar</Link>
          <form action={logout}><button type="submit">Çıkış</button></form>
        </nav>
        <ThemeSwitch />
      </div>
    </header>
  );
}
