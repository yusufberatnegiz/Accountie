import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CalendarView } from "@/components/calendar-view";
import { todayInIstanbul } from "@/lib/deadlines";
import { loadLiveDeadlines } from "@/lib/live-deadlines";

export const metadata: Metadata = { title: "Beyan ve Ödeme Takvimi" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const today = todayInIstanbul();
  const { items, error } = await loadLiveDeadlines(today);
  return <AppShell title="Beyan & Ödeme Takvimi">
    <section className="page-heading"><div><p className="eyebrow">Resmî süreler</p><h1>Tüm yükümlülükler</h1><p>Kaynak, işlem türü ve aciliyet durumuna göre arayın.</p></div></section>
    <div className="notice" role="status"><span className="notice-dot" />{error ?? "Takvim yalnızca resmî kaynaklardan canlı alınan kayıtları gösterir."}</div>
    <CalendarView items={items} today={today} />
  </AppShell>;
}
