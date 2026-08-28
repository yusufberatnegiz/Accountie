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
  return <AppShell title="Favoriler">
    <section className="page-heading"><div><p className="eyebrow">Hızlı erişim</p><h1>Favori kayıtlar</h1><p>Takvim ve güncel akıştan yıldızladığınız kayıtlar.</p></div></section>
    <section className="panel">
      {items.length ? <div className="favorites-list">{items.map((item) => <article key={`${item.itemType}:${item.id}`}>
        <div><span>{item.itemType === "calendar_event" ? "Takvim" : "Güncel akış"} · {item.date}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a>{item.summary ? <p>{item.summary}</p> : null}</div>
        <form action={toggleFavorite}><input name="itemType" type="hidden" value={item.itemType} /><input name="itemId" type="hidden" value={item.id} /><button className="icon-button selected" type="submit" aria-label="Favoriden çıkar">★</button></form>
      </article>)}</div> : <div className="empty"><strong>Henüz favori yok</strong>Takvim veya güncel akış kayıtlarındaki yıldızı seçin.</div>}
    </section>
  </AppShell>;
}
