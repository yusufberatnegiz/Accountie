import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = { title: "Notlar" };
export default function NotesPage() {
  return <AppShell title="Notlar"><section className="page-heading"><div><p className="eyebrow">Ofis içi</p><h1>Notlar ve hatırlatmalar</h1><p>Kişisel ve ofis geneli notlar Supabase bağlantısıyla etkinleşecek.</p></div></section><div className="panel"><div className="empty"><strong>Henüz not yok</strong>İlk veritabanı bağlantısından sonra not ekleyebilirsiniz.</div></div></AppShell>;
}
