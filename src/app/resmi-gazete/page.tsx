import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { UpdatesView } from "@/components/updates-view";
import { currentUser } from "@/lib/auth/current-user";
import { todayInIstanbul } from "@/lib/deadlines";
import { loadUpdates } from "@/lib/office-data";

export const metadata: Metadata = { title: "Resmî Gazete" };
export const dynamic = "force-dynamic";

export default async function OfficialGazettePage() {
  const user = await currentUser();
  const items = await loadUpdates(user.id, "resmi_gazete");
  const today = todayInIstanbul();
  const todayCount = items.filter((item) => item.publishedAt?.slice(0, 10) === today).length;
  const latestDate = items[0]?.publishedAt
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(items[0].publishedAt))
    : "Henüz yayın yok";

  return <AppShell title="Resmî Gazete">
    <section className="page-heading">
      <div><p className="eyebrow">Günlük resmî yayın</p><h1>Resmî Gazete</h1><p>Günlük fihrist yalnızca resmigazete.gov.tr üzerinden otomatik alınır.</p></div>
      <Link className="button secondary" href="https://www.resmigazete.gov.tr" target="_blank" rel="noreferrer">Resmî siteyi aç</Link>
    </section>
    <div className="notice" role="status"><span className="notice-dot" />Yeni sayı her gün Türkiye saatiyle 08:00’de kontrol edilir; “Şimdi tara” ile istediğiniz anda yenileyebilirsiniz.</div>
    <section className="stat-grid gazette-stats" aria-label="Resmî Gazete özeti">
      <article className="stat-card info"><span>Bugünün içerikleri</span><strong>{todayCount}</strong><small>{today}</small></article>
      <article className="stat-card success"><span>Son yayın tarihi</span><strong className="stat-value-text">{latestDate}</strong><small>Resmî fihrist</small></article>
      <article className="stat-card warning"><span>Listelenen içerik</span><strong>{items.length}</strong><small>Güncel arşiv</small></article>
    </section>
    <UpdatesView items={items} />
  </AppShell>;
}
