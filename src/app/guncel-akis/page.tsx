import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { todayInIstanbul } from "@/lib/deadlines";
import { fetchOfficialGazette, type GazetteIssue } from "@/lib/sources/resmi-gazete";

export const metadata: Metadata = { title: "Güncel Mevzuat" };
export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  let issue: GazetteIssue | null = null;
  let error: string | null = null;
  try {
    issue = await fetchOfficialGazette(todayInIstanbul());
  } catch (cause) {
    console.error("Resmî Gazete canlı kaynak hatası", cause);
    error = "Resmî Gazete kaynağına ulaşılamadı; güvenlik gereği içerik gösterilmedi.";
  }

  return <AppShell title="Güncel Mevzuat Akışı">
    <section className="page-heading">
      <div><p className="eyebrow">Canlı resmî kaynak</p><h1>Resmî Gazete</h1><p>Günün sayısı ve fihristi doğrudan T.C. Resmî Gazete sitesinden alınır.</p></div>
      {issue ? <a className="button secondary" href={issue.pdfUrl} target="_blank" rel="noreferrer">Gazete PDF’i ↗</a> : null}
    </section>
    <div className="notice" role="status"><span className="notice-dot" />{error ?? "Bu sayfadaki tüm içerik canlı resmî kaynaktan gelir; kopya veya demo kayıt gösterilmez."}</div>
    {issue ? <section className="panel">
      <div className="panel-heading"><div><h2>{issue.title}</h2><p><a className="source-link" href={issue.sourceUrl} target="_blank" rel="noreferrer">Resmî kaynak ↗</a></p></div></div>
      <div className="updates-list">{issue.items.map((item) => <article className="update-item" key={item.sourceUrl}>
        <div><span>{item.section}</span>{item.category ? <strong>{item.category}</strong> : null}</div>
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a>
      </article>)}</div>
    </section> : <div className="panel"><div className="empty"><strong>Canlı içerik alınamadı</strong>Resmî kaynağa erişim sağlandığında kayıtlar otomatik görünecek.</div></div>}
  </AppShell>;
}
