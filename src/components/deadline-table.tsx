"use client";

import { toggleFavorite } from "@/app/actions/items";
import type { DeadlineItem } from "@/lib/live-deadlines";
import { formatDate, getUrgency, urgencyLabel } from "@/lib/deadlines";

export function DeadlineTable({ items, today }: { items: DeadlineItem[]; today: string }) {
  if (!items.length) {
    return <div className="empty"><strong>Kayıt bulunamadı</strong>Filtreleri değiştirerek tekrar deneyin.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="deadline-table">
        <thead><tr><th aria-label="Favori">★</th><th>Kalan / Durum</th><th>Son gün</th><th>Kaynak</th><th>Vergi / Tür</th><th>İşlem</th><th>Dönem</th><th>Yükümlülük / Açıklama</th><th>Son kontrol</th></tr></thead>
        <tbody>
          {items.map((item) => {
            const urgency = getUrgency(item.dueDate, today);
            return (
              <tr key={item.id}>
                <td><form action={toggleFavorite}><input name="itemType" type="hidden" value="calendar_event" /><input name="itemId" type="hidden" value={item.id} /><button className={`icon-button${item.favorite ? " selected" : ""}`} type="submit" aria-label={item.favorite ? "Favoriden çıkar" : "Favoriye ekle"}>★</button></form></td>
                <td><span className={`status-pill status-${urgency}`}>{urgencyLabel(item.dueDate, today)}</span></td>
                <td>{formatDate(item.dueDate)}</td>
                <td><a className="source source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a></td>
                <td>{item.type}</td><td className="muted">{item.action}</td><td className="muted">{item.period}</td><td className="title-cell">{item.title}</td><td className="muted">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(item.lastCheckedAt))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
