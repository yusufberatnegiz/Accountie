import Link from "next/link";
import type { listReceipts, ReceiptStatus } from "@/db/queries";
import { BulkApproveButton } from "@/components/BulkApproveButton";
import { CaptureButton } from "@/components/CaptureButton";
import { ExportButton } from "@/components/ExportButton";
import { InstallHint } from "@/components/InstallHint";
import { ListTabs } from "@/components/ListTabs";
import { RowPending } from "@/components/RowPending";
import { MoveTransition } from "@/components/MoveTransition";
import { MonthPicker } from "@/components/MonthPicker";
import { DOC_KIND_LABEL, docKind } from "@/lib/doc-kind";
import { EXTENSION_STORE_URL } from "@/lib/extension-id";
import { monthLabel } from "@/lib/month";
import { formatTrAmount } from "@/lib/money";
import { listFinding, STATUS_LABELS } from "@/lib/status";

export const TABS: { slug: string; label: string; status?: ReceiptStatus }[] = [
  { slug: "", label: "Tümü" },
  { slug: "taslak", label: "Taslak", status: "draft" },
  { slug: "onayli", label: "Onaylandı", status: "approved" },
  { slug: "aktarildi", label: "Aktarıldı", status: "exported" },
];

type Row = Awaited<ReturnType<typeof listReceipts>>[number];

const trDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : null);

/** Receipt list screen; the page and the dev preview both render it. Rows hold every status, the table shows `tab`. */
export function ReceiptListView({ receipts: all, tab, firm, month = "", months, base = "/panel" }: { receipts: Row[]; tab: (typeof TABS)[number]; firm?: { name: string }; month?: string; months?: string[]; base?: string }) {
  // The tabs keep the chosen month, and the month picker keeps the tab.
  const withMonth = (q: string) => { const p = new URLSearchParams(q); if (month) p.set("ay", month); const s = p.toString(); return s ? `${base}?${s}` : base; };
  const count = (s?: ReceiptStatus) => (s ? all.filter((r) => r.status === s).length : all.length);
  const receipts = tab.status ? all.filter((r) => r.status === tab.status) : all;
  const ready = all.filter((r) => r.status === "approved");
  const drafts = count("draft");
  // Only drafts without a single warning; the rest still need a look on their own screen.
  const clean = tab.status === "draft" || !tab.status ? receipts.filter((r) => r.status === "draft" && r.warnings.length === 0) : [];
  // Under Tümü only approved and exported receipts count, so a draft never reads as a booked figure.
  const counted = tab.status ? receipts : receipts.filter((r) => r.status !== "draft");
  // A Z report is sales, not an expense: it stays out of the KDV sum.
  const vatTotal = counted.reduce((n, r) => n + (r.expenseCode && docKind(r.category) !== "z_report" ? r.vatKurus : 0), 0);

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-list">
      <div className="title-row">
        <div className="title-text">
          {/* The firm these receipts are for; a müşavir switches between hundreds, so it is always named above the list. */}
          {firm ? <p className="crumb firm-crumb"><Link href={`${base}/firmalar`} aria-label={`Firma: ${firm.name}. Firma değiştir`}>{firm.name}</Link></p> : null}
          <h1>Fişler</h1>
          {/* Excel and the extension are desktop tasks; on the phone the finding says where the file is downloaded. */}
          <p className="finding">{listFinding(drafts, ready.length)}{ready.length ? <span className="phone-only-inline"> Dosyayı bilgisayardan indirin.</span> : null}</p>
        </div>
        <div className="title-actions">
          {months ? <MonthPicker months={months} value={month} path={base} /> : null}
          {all.length || month ? <CaptureButton base={base} /> : null}
        </div>
      </div>

      {all.length ? (
        <dl className="tiles" aria-label={month ? `${monthLabel(month)} özeti` : "Özet"}>
          <div><dt>Fiş</dt><dd>{all.length}</dd></div>
          <div className="tile-draft"><dt>Kontrol bekleyen</dt><dd>{drafts}</dd></div>
          <div><dt>Luca&apos;ya hazır</dt><dd>{ready.length}</dd></div>
          <div><dt>İndirilecek KDV</dt><dd>{formatTrAmount(vatTotal)}</dd></div>
        </dl>
      ) : null}

      <section className="panel list-panel" aria-labelledby="liste-baslik">
        <h2 id="liste-baslik" className="visually-hidden">Fiş listesi</h2>
        <ListTabs active={tab.slug} tabs={TABS.map((t) => ({ slug: t.slug, label: t.label, href: withMonth(t.slug ? `durum=${t.slug}` : ""), count: count(t.status) }))} />
        {receipts.length === 0 ? (
          <div className="empty-row">
            {month && !all.length ? <p>{monthLabel(month)} için fiş yok.</p> : all.length ? <p>{tab.label} durumunda fiş yok.</p> : (
              <>
                <h3>Henüz fiş yok</h3>
                <p>İlk fişin fotoğrafını çekin. Satırlar hesap kurallarınıza göre hazırlanır ve burada kontrolünüzü bekler.</p>
                <CaptureButton base={base} />
                {/* First run: the whole way to Luca, in the order it happens. */}
                <ol className="first-run">
                  <li><strong>Hesap kodlarını kontrol edin.</strong> Varsayılan plan kopyalandı; <Link href={`${base}/kurallar`}>hesap kurallarında</Link> kendi kodlarınızı yazın.</li>
                  <li><strong>Fişi çekin ya da faturayı yükleyin.</strong> Satıcı, tarih, KDV ve toplam okunur, satırlar hazırlanır.</li>
                  <li><strong>Kontrol edip onaylayın.</strong> Borç ile alacak eşit olmadan onay verilmez.</li>
                  <li><strong>Luca&apos;ya aktarın.</strong> <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">Chrome eklentisi</a> onaylı fişleri Luca&apos;nın Fiş Detayı ekranına yazar. İsterseniz Excel dosyası olarak da indirebilirsiniz.</li>
                </ol>
              </>
            )}
          </div>
        ) : (
          <table className="receipts">
            <thead>
              <tr><th className="col-vendor">Satıcı</th><th className="num col-no">Evrak No</th><th className="num col-date">Tarih</th><th className="num col-code">Gider hesabı</th><th className="num col-total">Toplam</th><th className="col-status">Durum</th></tr>
            </thead>
            <tbody>
              {receipts.map((r) => {
                const notes = r.status === "draft" ? r.warnings.length : 0;
                return (
                  // A new receipt rises in at the top; a downloaded one slides out toward the Aktarıldı tab. A tab change uses the same
                  // two moves, in order: rows leaving the filter go out first, then the rest slide to their place and rows joining it rise in.
                  <MoveTransition key={r.id} enter={{ "fis-eklendi": "row-rise", sekme: "row-join", default: "none" }} exit={{ aktarim: "row-out", sekme: "row-leave", default: "none" }}
                    update={{ "fis-eklendi": "row-move", aktarim: "row-move", sekme: "row-shift", default: "none" }} default="none">
                  <tr>
                    <td className="r-vendor">
                      <Link className="row-link" href={`${base}/fis/${r.id}`} title={r.vendorName ?? undefined} transitionTypes={["fis-ac"]}>
                        {/* The vendor name becomes the review screen's title (ReviewEditor). */}
                        <MoveTransition name={`fis-${r.id}`} share="title-morph" default="none"><span>{r.vendorName ?? "Okunamayan fiş"}</span></MoveTransition>
                        <RowPending />
                      </Link>
                      {r.invoice || DOC_KIND_LABEL[docKind(r.category)] ? <span className="r-kind">{r.invoice ? "Fatura" : DOC_KIND_LABEL[docKind(r.category)]}</span> : null}
                      {notes ? <span className="r-notes">{notes} uyarı</span> : null}
                    </td>
                    <td className="r-no num" translate="no" title={r.receiptNo ?? undefined}>{r.receiptNo ?? <span className="dash">-</span>}</td>
                    <td className="r-date num">{trDate(r.receiptDate) ?? <span className="dash">Tarih yok</span>}</td>
                    <td className="r-code num" translate="no">{docKind(r.category) === "z_report" ? <span className="dash">Satış</span> : r.expenseCode ?? <span className="dash">-</span>}</td>
                    <td className="r-total num">{r.totalKurus === null ? <span className="dash">-</span> : <>{formatTrAmount(r.totalKurus)}<span className="unit">&nbsp;TL</span></>}</td>
                    <td className="r-status"><span className={`status status-${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                  </tr>
                  </MoveTransition>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="side-links small list-links"><Link href={`${base}/mutabakat${month ? `?ay=${month}` : ""}`}>Muavinle karşılaştır</Link></p>
        {clean.length > 1 ? <div className="list-foot"><BulkApproveButton receiptIds={clean.map((r) => r.id)} /></div> : null}
        {tab.status === "exported" && receipts.length > 0 ? (
          <div className="list-foot desktop-only">
            {/* shortcut: re-downloads only the newest 50 (one Luca file); older ones are re-downloaded one by one from the receipt page. */}
            <ExportButton receiptIds={receipts.slice(0, 50).map((r) => r.id)}
              label={receipts.length > 50 ? "Son 50 fişi tekrar indir" : "Bu listeyi tekrar indir"} />
          </div>
        ) : null}
      </section>

      <div className="side phone-only"><InstallHint /></div>
    </main>
  );
}
