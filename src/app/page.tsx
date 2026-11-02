import Link from "next/link";
import { redirect } from "next/navigation";
import { listReceipts, type ReceiptStatus } from "@/db/queries";
import { AppHeader } from "@/components/AppHeader";
import { CaptureButton } from "@/components/CaptureButton";
import { ExportButton } from "@/components/ExportButton";
import { ExtensionTokenPanel } from "@/components/ExtensionTokenPanel";
import { getUserId } from "@/lib/auth/session";
import { formatTrAmount } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/status";

export const dynamic = "force-dynamic";

const TABS: { slug: string; label: string; status?: ReceiptStatus }[] = [
  { slug: "", label: "Tümü" },
  { slug: "taslak", label: "Taslak", status: "draft" },
  { slug: "onayli", label: "Onaylandı", status: "approved" },
  { slug: "aktarildi", label: "Aktarıldı", status: "exported" },
];

const trDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "Tarih yok");

export default async function HomePage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/giris");
  const { durum = "" } = await searchParams;
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  const receipts = await listReceipts(userId, tab.status);

  return (
    <>
      <AppHeader current="fisler" />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Fişler</h1>
            <p>Fişin fotoğrafını çekin, satırları kontrol edip onaylayın, onaylıları Luca için indirin.</p>
          </div>
          <CaptureButton />
        </div>

        <section className="panel">
          <nav className="tabs" aria-label="Fiş durumu">
            {TABS.map((t) => (
              <Link key={t.slug} href={t.slug ? `/?durum=${t.slug}` : "/"} aria-current={t === tab ? "page" : undefined}>{t.label}</Link>
            ))}
          </nav>
          {receipts.length === 0 ? (
            <p className="empty">Bu listede fiş yok.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Satıcı</th><th>Evrak No</th><th>Tarih</th><th className="num">Toplam (TL)</th><th>Durum</th></tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id}>
                      <td><Link className="row-link" href={`/fis/${r.id}`}>{r.vendorName ?? "Okunamayan fiş"}</Link></td>
                      <td className="mono">{r.receiptNo ?? ""}</td>
                      <td>{trDate(r.receiptDate)}</td>
                      <td className="num">{r.totalKurus === null ? "" : formatTrAmount(r.totalKurus)}</td>
                      <td><span className={`status status-${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel panel-pad" aria-labelledby="luca-title" style={{ display: "grid", gap: "var(--s3)" }}>
          <h2 id="luca-title">Luca&apos;ya aktarım</h2>
          <p className="muted">Onaylanmış ve henüz aktarılmamış fişler tek bir Excel dosyasına yazılır.</p>
          <ExportButton />
          <ol className="guide">
            <li>Luca&apos;da Muhasebe, Fiş İşlemleri, Excel veri aktarımı ekranını açın.</li>
            <li>İndirdiğiniz dosyayı seçin, doğrulama kodunu yazıp Yükle&apos;ye basın.</li>
            <li>Önizlemeyi kontrol edip Fiş Kes ile fişleri oluşturun.</li>
          </ol>
          <p className="muted">Dosya düzeni Luca&apos;nın resmi şablonuyla henüz doğrulanmadı. İlk yüklemede önizlemedeki hesap kodlarını ve tutarları fişle karşılaştırın.</p>
        </section>

        <section className="panel panel-pad" aria-labelledby="ext-title" style={{ display: "grid", gap: "var(--s3)" }}>
          <h2 id="ext-title">Chrome eklentisi ile doldurma</h2>
          <p className="muted">Eklenti onaylı fişin satırlarını Luca&apos;da açık olan Fiş Detayı ekranına yazar. Kaydet&apos;e siz basarsınız. Anahtar 12 saat geçerlidir ve yalnızca sizin onaylı fişlerinizi okur.</p>
          <ExtensionTokenPanel />
        </section>
      </main>
    </>
  );
}
