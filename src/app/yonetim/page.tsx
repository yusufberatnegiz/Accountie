import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = { title: "Kaynak Yönetimi" };
const sources = [
  ["GİB Vergi Takvimi", "Beyan ve ödeme süreleri", "https://www.gib.gov.tr/vergi-takvimi"],
  ["SGK Duyuruları", "Prim ve işveren bildirimleri", "https://www.sgk.gov.tr/Duyuru"],
  ["Resmî Gazete", "Mevzuat değişiklikleri", "https://www.resmigazete.gov.tr/"],
] as const;
export default function AdminPage() {
  return <AppShell title="Kaynak Yönetimi"><section className="page-heading"><div><p className="eyebrow">Yönetim</p><h1>Resmî kaynaklar</h1><p>Otomatik taranacak izinli kaynaklar ve bağlantı durumları.</p></div></section><section className="simple-grid">{sources.map(([name, description, url]) => <article className="source-card" key={name}><h2>{name}</h2><p>{description}</p><div className="source-meta"><span className="source-ok">● İzinli kaynak</span><a className="source-link" href={url} target="_blank" rel="noreferrer">Kaynağı aç ↗</a></div></article>)}</section></AppShell>;
}
