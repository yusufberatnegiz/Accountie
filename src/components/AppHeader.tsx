import Link from "next/link";
import { logout } from "@/app/giris/actions";

export function AppHeader({ current }: { current: "fisler" | "kurallar" }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">Accountie</Link>
      <nav className="nav" aria-label="Ana menü">
        <Link href="/" aria-current={current === "fisler" ? "page" : undefined}>Fişler</Link>
        <Link href="/kurallar" aria-current={current === "kurallar" ? "page" : undefined}>Kurallar</Link>
        <form action={logout}><button type="submit">Çıkış</button></form>
      </nav>
    </header>
  );
}
