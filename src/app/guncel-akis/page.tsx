import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { UpdatesView } from "@/components/updates-view";
import { currentUser } from "@/lib/auth/current-user";
import { loadUpdates } from "@/lib/office-data";

export const metadata: Metadata = { title: "Güncel Mevzuat" };
export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const user = await currentUser();
  const items = await loadUpdates(user.id);
  return <AppShell title="Güncel Mevzuat Akışı">
    <section className="page-heading"><div><p className="eyebrow">Canlı resmî kaynaklar</p><h1>Güncel akış</h1><p>GİB takvimi, SGK duyuruları ve Resmî Gazete tek akışta.</p></div></section>
    <div className="notice" role="status"><span className="notice-dot" />İçerikler otomatik taranır, resmî bağlantısıyla saklanır ve ofiste doğrudan yayımlanır.</div>
    <UpdatesView items={items} />
  </AppShell>;
}
