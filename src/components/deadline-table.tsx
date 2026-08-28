import type { DeadlineItem } from "@/lib/live-deadlines";
import { formatDate, getUrgency, urgencyLabel } from "@/lib/deadlines";

export function DeadlineTable({ items, today }: { items: DeadlineItem[]; today: string }) {
  if (!items.length) {
    return <div className="empty"><strong>Kayıt bulunamadı</strong>Filtreleri değiştirerek tekrar deneyin.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="deadline-table">
        <thead><tr><th>Kalan / Durum</th><th>Son gün</th><th>Kaynak</th><th>Vergi / Tür</th><th>İşlem</th><th>Dönem</th><th>Yükümlülük / Açıklama</th></tr></thead>
        <tbody>
          {items.map((item) => {
            const urgency = getUrgency(item.dueDate, today);
            return (
              <tr key={item.id}>
                <td><span className={`status-pill status-${urgency}`}>{urgencyLabel(item.dueDate, today)}</span></td>
                <td>{formatDate(item.dueDate)}</td>
                <td><a className="source source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a></td>
                <td>{item.type}</td><td className="muted">{item.action}</td><td className="muted">{item.period}</td><td className="title-cell">{item.title}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
