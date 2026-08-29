import type { Metadata } from "next";
import { toggleFavorite } from "@/app/actions/items";
import { AppShell } from "@/components/app-shell";
import { currentUser } from "@/lib/auth/current-user";
import { loadFavoriteItems } from "@/lib/office-data";

export const metadata: Metadata = { title: "Favoriler" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await currentUser();
  const items = await loadFavoriteItems(user.id);
  const calendarItems = items.filter((item) => item.itemType === "calendar_event");
  const updateItems = items.filter((item) => item.itemType === "update");

  const favoriteList = (list: typeof items, emptyText: string) => list.length ? <div className="favorites-list">{list.map((item) => <article key={`${item.itemType}:${item.id}`}>
    <div><span>{item.date}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a>{item.summary ? <p>{item.summary}</p> : null}</div>
    <form action={toggleFavorite}><input name="itemType" type="hidden" value={item.itemType} /><input name="itemId" type="hidden" value={item.id} /><button className="icon-button selected" type="submit" aria-label="Favoriden çıkar">★</button></form>
  </article>)}</div> : <div className="empty compact"><strong>Kayıt yok</strong>{emptyText}</div>;

  return <AppShell title="Favoriler">
    <section className="page-heading"><div><p className="eyebrow">Hızlı erişim</p><h1>Favori kayıtlar</h1><p>Takvim ve güncel akıştan yıldızladığınız kayıtlar.</p></div></section>
    <div className="favorites-stack">
      <section className="panel"><div className="panel-heading"><div><h2>Takvim kayıtları</h2><p>{calendarItems.length} favori</p></div></div>{favoriteList(calendarItems, "Takvimdeki yıldız simgesini seçerek ekleyebilirsiniz.")}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Mevzuat duyuruları</h2><p>{updateItems.length} favori</p></div></div>{favoriteList(updateItems, "Güncel akıştaki yıldız simgesini seçerek ekleyebilirsiniz.")}</section>
    </div>
  </AppShell>;
}
