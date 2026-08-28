import Link from "next/link";
import { DeadlineTable } from "@/components/deadline-table";
import { AppShell } from "@/components/app-shell";
import { currentUser } from "@/lib/auth/current-user";
import { daysUntil, getUrgency, todayInIstanbul } from "@/lib/deadlines";
import { loadLiveDeadlines } from "@/lib/live-deadlines";
import { loadUpcomingReminders } from "@/lib/office-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  const today = todayInIstanbul();
  const [{ items, error }, reminders] = await Promise.all([loadLiveDeadlines(user.id), loadUpcomingReminders(user.id)]);
  const activeItems = items
    .filter((item) => daysUntil(item.dueDate, today) >= 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const todayCount = activeItems.filter((item) => getUrgency(item.dueDate, today) === "today").length;
  const nextWeekCount = activeItems.filter((item) => {
    const days = daysUntil(item.dueDate, today);
    return days >= 0 && days <= 7;
  }).length;
  const gibCount = activeItems.filter((item) => item.source === "GİB").length;
  const sgkCount = activeItems.filter((item) => item.source === "SGK").length;

  return (
    <AppShell title="Beyan & Ödeme Takvimi">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Günlük ofis takibi</p>
          <h1>Yaklaşan yükümlülükler</h1>
          <p>Resmî kaynaklardaki beyan, bildirim ve ödeme sürelerini tek ekranda izleyin.</p>
        </div>
        <Link className="button secondary" href="/takvim">Tüm takvimi aç</Link>
      </section>
      <div className="notice" role="status">
        <span className="notice-dot" />
        {error ?? "Kayıtlar GİB, SGK ve Resmî Gazete’nin resmî yüzeylerinden otomatik alınır; demo kayıt gösterilmez."}
      </div>
      <section className="stat-grid" aria-label="Takvim özeti">
        <article className="stat-card danger"><span>Bugün son gün</span><strong>{todayCount}</strong><small>Öncelikli işlem</small></article>
        <article className="stat-card warning"><span>7 gün içinde</span><strong>{nextWeekCount}</strong><small>Bugün dahil</small></article>
        <article className="stat-card info"><span>Yaklaşan GİB</span><strong>{gibCount}</strong><small>Aktif kayıt</small></article>
        <article className="stat-card success"><span>Yaklaşan SGK</span><strong>{sgkCount}</strong><small>Aktif kayıt</small></article>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Öncelikli işlemler</h2><p>Son güne göre sıralanmış güncel yükümlülükler</p></div>
          <div className="legend" aria-label="Aciliyet açıklaması">
            <span className="legend-safe">8+ gün</span><span className="legend-near">4–7 gün</span><span className="legend-urgent">1–3 gün</span><span className="legend-today">Son gün</span>
          </div>
        </div>
        <DeadlineTable items={activeItems.slice(0, 9)} today={today} />
      </section>
      <section className="panel dashboard-reminders">
        <div className="panel-heading"><div><h2>Yaklaşan hatırlatmalar</h2><p>Kişisel notlarınızdaki sıradaki tarihler</p></div><Link className="source-link" href="/notlar">Tüm notlar →</Link></div>
        {reminders.length ? <div className="reminder-list">{reminders.map((note) => <article key={note.id}><strong>{note.title}</strong><span>{note.reminderAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(note.reminderAt) : ""}</span></article>)}</div> : <div className="empty compact"><strong>Yaklaşan hatırlatma yok</strong>Notlar bölümünden tarihli bir hatırlatma ekleyebilirsiniz.</div>}
      </section>
    </AppShell>
  );
}
