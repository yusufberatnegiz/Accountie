"use client";

import { useMemo, useState } from "react";
import type { DeadlineItem } from "@/lib/live-deadlines";
import { getUrgency } from "@/lib/deadlines";
import { DeadlineTable } from "./deadline-table";

export function CalendarView({ items, today }: { items: DeadlineItem[]; today: string }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [action, setAction] = useState("all");
  const [taxType, setTaxType] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showPast, setShowPast] = useState(false);
  const taxTypes = useMemo(() => [...new Set(items.map((item) => item.type))].sort((a, b) => a.localeCompare(b, "tr")), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.title} ${item.type} ${item.period}`.toLocaleLowerCase("tr");
    return haystack.includes(query.toLocaleLowerCase("tr"))
      && (source === "all" || item.source === source)
      && (action === "all" || item.action === action)
      && (taxType === "all" || item.type === taxType)
      && (urgency === "all" || getUrgency(item.dueDate, today) === urgency)
      && (showPast || item.dueDate >= today)
      && (!from || item.dueDate >= from)
      && (!to || item.dueDate <= to);
  }), [items, today, query, source, action, taxType, urgency, showPast, from, to]);

  return (
    <section className="panel">
      <div className="filters">
        <input className="field search" type="search" placeholder="Yükümlülük veya dönem ara…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Takvimde ara" />
        <select className="field" value={source} onChange={(event) => setSource(event.target.value)} aria-label="Kaynak"><option value="all">Tüm kaynaklar</option><option>GİB</option><option>SGK</option></select>
        <select className="field" value={action} onChange={(event) => setAction(event.target.value)} aria-label="İşlem"><option value="all">Tüm işlemler</option><option>Beyan ve Ödeme</option><option>Bildirim</option><option>Ödeme</option><option>Berat</option></select>
        <select className="field" value={taxType} onChange={(event) => setTaxType(event.target.value)} aria-label="Vergi veya tür"><option value="all">Tüm vergi / türler</option>{taxTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <select className="field" value={urgency} onChange={(event) => setUrgency(event.target.value)} aria-label="Durum"><option value="all">Tüm durumlar</option><option value="today">Son gün</option><option value="urgent">1–3 gün</option><option value="near">4–7 gün</option><option value="safe">8+ gün</option></select>
        <label className="compact-field">Başlangıç<input className="field" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="compact-field">Bitiş<input className="field" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label className="check-field"><input type="checkbox" checked={showPast} onChange={(event) => setShowPast(event.target.checked)} /> Geçmiş kayıtları göster</label>
      </div>
      <DeadlineTable items={filtered} today={today} />
    </section>
  );
}
