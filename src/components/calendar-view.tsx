"use client";

import { useMemo, useState } from "react";
import type { DeadlineItem } from "@/lib/live-deadlines";
import { getUrgency } from "@/lib/deadlines";
import { DeadlineTable } from "./deadline-table";

export function CalendarView({ items, today }: { items: DeadlineItem[]; today: string }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [action, setAction] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.title} ${item.type} ${item.period}`.toLocaleLowerCase("tr");
    return haystack.includes(query.toLocaleLowerCase("tr"))
      && (source === "all" || item.source === source)
      && (action === "all" || item.action === action)
      && (urgency === "all" || getUrgency(item.dueDate, today) === urgency);
  }), [items, today, query, source, action, urgency]);

  return (
    <section className="panel">
      <div className="filters">
        <input className="field search" type="search" placeholder="Yükümlülük veya dönem ara…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Takvimde ara" />
        <select className="field" value={source} onChange={(event) => setSource(event.target.value)} aria-label="Kaynak"><option value="all">Tüm kaynaklar</option><option>GİB</option><option>SGK</option></select>
        <select className="field" value={action} onChange={(event) => setAction(event.target.value)} aria-label="İşlem"><option value="all">Tüm işlemler</option><option>Beyan ve Ödeme</option><option>Bildirim</option><option>Ödeme</option><option>Berat</option></select>
        <select className="field" value={urgency} onChange={(event) => setUrgency(event.target.value)} aria-label="Durum"><option value="all">Tüm durumlar</option><option value="today">Son gün</option><option value="urgent">1–3 gün</option><option value="near">4–7 gün</option><option value="safe">8+ gün</option></select>
      </div>
      <DeadlineTable items={filtered} today={today} />
    </section>
  );
}
