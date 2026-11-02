import Link from "next/link";
import type { listReceipts, ReceiptStatus } from "@/db/queries";
import { CaptureButton } from "@/components/CaptureButton";
import { ExportButton } from "@/components/ExportButton";
import { ExtensionTokenPanel } from "@/components/ExtensionTokenPanel";
import { InstallHint } from "@/components/InstallHint";
import { formatTrAmount } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/status";

export const TABS: { slug: string; label: string; status?: ReceiptStatus }[] = [
  { slug: "", label: "Tümü" },
  { slug: "taslak", label: "Taslak", status: "draft" },
  { slug: "onayli", label: "Onaylandı", status: "approved" },
  { slug: "aktarildi", label: "Aktarıldı", status: "exported" },
];

const trDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "Tarih yok");

/** Receipt list screen body; the page and the dev preview both render it. */
export function HomeView({ receipts, tab, base = "/" }: { receipts: Awaited<ReturnType<typeof listReceipts>>; tab: (typeof TABS)[number]; base?: string }) {
  return (
    <main className="page page-home">
      <div className="page-head">
        <div>
          <h1>Fişler</h1>
          <p>Fotoğrafını çekin, satırları kontrol edip onaylayın, onaylıları Luca&apos;ya aktarın.</p>
        </div>
        <CaptureButton />
      </div>

      <section className="panel" aria-label="Fiş listesi">
        <nav className="tabs" aria-label="Fiş durumu">
          {TABS.map((t) => (
            <Link key={t.slug} href={t.slug ? `${base}?durum=${t.slug}` : base} aria-current={t === tab ? "page" : undefined}>{t.label}</Link>
          ))}
        </nav>
        {receipts.length === 0 ? (
          <p className="empty">{tab.status ? `${tab.label} durumunda fiş yok.` : "Henüz fiş yok. İlk fişin fotoğrafını çekin."}</p>
        ) : (
          <table className="receipts">
            <thead>
              <tr><th>Satıcı</th><th>Evrak No</th><th>Tarih</th><th className="num">Toplam (TL)</th><th>Durum</th></tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="r-vendor"><Link className="row-link" href={`${base === "/" ? "" : base}/fis/${r.id}`}>{r.vendorName ?? "Okunamayan fiş"}</Link></td>
                  <td className="r-no num-font">{r.receiptNo ?? ""}</td>
                  <td className="r-date">{trDate(r.receiptDate)}</td>
                  <td className="r-total num">{r.totalKurus === null ? "" : formatTrAmount(r.totalKurus)}</td>
                  <td className="r-status"><span className={`status status-${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="side-sections">
        <p className="phone-only muted small">Luca&apos;ya aktarım ve eklenti anahtarı bilgisayarda, bu sayfanın altında yapılır.</p>
        <section className="panel panel-pad stack desktop-only" aria-labelledby="luca-title">
          <h2 id="luca-title">Luca&apos;ya aktarım</h2>
          <p>Onaylanmış ve henüz aktarılmamış fişler tek bir Excel dosyasına yazılır.</p>
          <ExportButton label="Onaylı fişleri Excel olarak indir" />
          <ol className="guide">
            <li>Luca&apos;da Muhasebe, Fiş İşlemleri, Excel veri aktarımı ekranını açın.</li>
            <li>İndirdiğiniz dosyayı seçin, doğrulama kodunu yazıp Yükle&apos;ye basın.</li>
            <li>Önizlemeyi kontrol edip Fiş Kes ile fişleri oluşturun.</li>
          </ol>
          <p className="muted small">Dosya düzeni Luca&apos;nın resmi şablonuyla henüz doğrulanmadı. İlk yüklemede önizlemedeki hesap kodlarını ve tutarları fişle karşılaştırın.</p>
          <p className="muted small">İndirilen fişler &quot;Aktarıldı&quot; olur ve bu listeden düşer. Luca dosyayı reddederse fişi açıp &quot;Luca için Excel indir&quot; ile tekrar indirin.</p>
        </section>

        <section className="panel panel-pad stack desktop-only" aria-labelledby="ext-title">
          <h2 id="ext-title">Chrome eklentisi ile doldurma</h2>
          <p>Eklenti onaylı fişin satırlarını Luca&apos;da açık olan Fiş Detayı ekranına yazar. Kaydet&apos;e siz basarsınız.</p>
          <p className="muted small">Anahtar 12 saat geçerlidir ve yalnızca sizin onaylı fişlerinizi okur.</p>
          <ExtensionTokenPanel />
        </section>

        <InstallHint />
      </div>
    </main>
  );
}
