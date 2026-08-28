import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = { title: "Favoriler" };
export default function FavoritesPage() {
  return <AppShell title="Favoriler"><section className="page-heading"><div><p className="eyebrow">Hızlı erişim</p><h1>Favori kayıtlar</h1><p>Sık takip ettiğiniz takvim ve mevzuat kayıtları burada toplanacak.</p></div></section><div className="panel"><div className="empty"><strong>Henüz favori yok</strong>Takvim kayıtlarını yıldızlayarak buraya ekleyebileceksiniz.</div></div></AppShell>;
}
