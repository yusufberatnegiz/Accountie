"use client";

import { useMemo, useState } from "react";
import { toggleFavorite, toggleRead } from "@/app/actions/items";
import type { UpdateItem } from "@/lib/office-data";

export function UpdatesView({ items }: { items: UpdateItem[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.title} ${item.summary}`.toLocaleLowerCase("tr");
    return text.includes(query.toLocaleLowerCase("tr")) && (source === "all" || item.source === source) && (!unreadOnly || !item.read);
  }), [items, query, source, unreadOnly]);

  return <section className="panel">
    <div className="filters updates-filters">
      <input className="field search" type="search" placeholder="Başlık veya içerik ara…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select className="field" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Tüm kaynaklar</option><option>GİB</option><option>SGK</option><option>Resmî Gazete</option></select>
      <label className="check-field"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> Yalnızca okunmamış</label>
    </div>
    {filtered.length ? <div className="updates-list">{filtered.map((item) => <article className={`update-item${item.read ? " read" : ""}`} key={item.id}>
      <div><span>{item.publishedAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(item.publishedAt)) : "Tarih yok"}</span><strong>{item.source}</strong></div>
      <div className="update-copy"><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a>{item.summary ? <p>{item.summary}</p> : null}</div>
      <div className="item-actions">
        <form action={toggleFavorite}><input name="itemType" type="hidden" value="update" /><input name="itemId" type="hidden" value={item.id} /><button className={`icon-button${item.favorite ? " selected" : ""}`} type="submit" aria-label="Favori">★</button></form>
        <form action={toggleRead}><input name="itemId" type="hidden" value={item.id} /><button className="button secondary" type="submit">{item.read ? "Okunmadı yap" : "Okundu"}</button></form>
      </div>
    </article>)}</div> : <div className="empty"><strong>Kayıt bulunamadı</strong>Filtreleri değiştirerek tekrar deneyin.</div>}
  </section>;
}
