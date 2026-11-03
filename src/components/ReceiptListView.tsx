import Link from "next/link";
import type { listReceipts, ReceiptStatus } from "@/db/queries";
import { CaptureButton } from "@/components/CaptureButton";
import { ExportButton } from "@/components/ExportButton";
import { InstallHint } from "@/components/InstallHint";
import { CATEGORIES } from "@/lib/default-rules";
import { MAX_LINES_PER_FILE, MAX_RECEIPTS_PER_FILE } from "@/lib/luca/export";
import { formatTrAmount } from "@/lib/money";
import { listFinding, STATUS_LABELS } from "@/lib/status";

export const TABS: { slug: string; label: string; status?: ReceiptStatus }[] = [
  { slug: "", label: "Tümü" },
  { slug: "taslak", label: "Taslak", status: "draft" },
  { slug: "onayli", label: "Onaylı", status: "approved" },
  { slug: "aktarildi", label: "Aktarıldı", status: "exported" },
];

// Default names only: a renamed account still shows its code, which is what Luca matches on.
const accountNames: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.account.code, c.label]));

// What the per-account totals add up: the receipts in the open tab.
const SCOPES: Record<string, string> = { taslak: "Taslak fişler", onayli: "Onaylı fişler", aktarildi: "Aktarılan fişler" };

type Row = Awaited<ReturnType<typeof listReceipts>>[number];

const trDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : null);

/** Luca takes one file of at most 50 receipts and 400 lines; the meter shows how full the next file is. */
function LucaMeter({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="meter">
      <p className="meter-head"><span>{label}</span><span className="num"><span className="meter-value">{value}</span> / {max}</span></p>
      <span className="meter-track" aria-hidden="true"><span className="meter-fill" style={{ transform: `scaleX(${Math.min(1, value / max)})` }} /></span>
    </div>
  );
}

/** Receipt list screen; the page and the dev preview both render it. Rows hold every status, the table shows `tab`. */
export function ReceiptListView({ receipts: all, tab, base = "/panel" }: { receipts: Row[]; tab: (typeof TABS)[number]; base?: string }) {
  const count = (s?: ReceiptStatus) => (s ? all.filter((r) => r.status === s).length : all.length);
  const receipts = tab.status ? all.filter((r) => r.status === tab.status) : all;
  const ready = all.filter((r) => r.status === "approved");
  const readyLines = ready.reduce((n, r) => n + r.lineCount, 0);
  const files = Math.max(Math.ceil(ready.length / MAX_RECEIPTS_PER_FILE), Math.ceil(readyLines / MAX_LINES_PER_FILE));
  const drafts = count("draft");
  // Matrah per expense account in the current view, most first: the debits Luca books on 770, VAT apart on 191.
  // shortcut: a receipt's whole expense side is booked to its first expense code; split per line if users start mixing 770 codes on one receipt.
  const sums = new Map<string, number>();
  for (const r of receipts) if (r.expenseCode && r.expenseKurus) sums.set(r.expenseCode, (sums.get(r.expenseCode) ?? 0) + r.expenseKurus);
  const byAccount = [...sums].sort((a, b) => b[1] - a[1]);
  const vatTotal = receipts.reduce((n, r) => n + (r.expenseCode ? r.vatKurus : 0), 0);

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-list">
      <div className="title-row">
        <div className="title-text">
          <p className="crumb" translate="no">Accountie</p>
          <h1>Fişler</h1>
          {/* Excel and the extension are desktop tasks; on the phone the finding says where the file is downloaded. */}
          <p className="finding">{listFinding(drafts, ready.length)}{ready.length ? <span className="phone-only-inline"> Dosyayı bilgisayardan indirin.</span> : null}</p>
        </div>
        {all.length ? <CaptureButton /> : null}
      </div>

      <section className="panel list-panel" aria-labelledby="liste-baslik">
        <h2 id="liste-baslik" className="visually-hidden">Fiş listesi</h2>
        <nav className="tabs" aria-label="Fiş durumu">
          {TABS.map((t) => (
            <Link key={t.slug} href={t.slug ? `${base}?durum=${t.slug}` : base} aria-current={t === tab ? "page" : undefined}>
              {t.label} <span className="tab-count">{count(t.status)}</span>
            </Link>
          ))}
        </nav>
        {receipts.length === 0 ? (
          <div className="empty-row">
            {all.length ? <p>{tab.label} durumunda fiş yok.</p> : (
              <>
                <h3>Henüz fiş yok</h3>
                <p>İlk fişin fotoğrafını çekin. Satırlar hesap kurallarınıza göre hazırlanır ve burada kontrolünüzü bekler.</p>
                <CaptureButton />
                {/* First run: the whole way to Luca, in the order it happens. */}
                <ol className="first-run">
                  <li><strong>Hesap kodlarını kontrol edin.</strong> Varsayılan plan kopyalandı; <Link href={`${base}/kurallar`}>hesap kurallarında</Link> kendi kodlarınızı yazın.</li>
                  <li><strong>Fişi çekin.</strong> Satıcı, tarih, KDV ve toplam okunur, satırlar hazırlanır.</li>
                  <li><strong>Kontrol edip onaylayın.</strong> Borç ile alacak eşit olmadan onay verilmez.</li>
                  <li><strong>Luca için indirin.</strong> Onaylı fişler tek Excel dosyasında, Luca&apos;nın Excel veri aktarımı ekranına yüklenir.</li>
                </ol>
              </>
            )}
          </div>
        ) : (
          <table className="receipts">
            <thead>
              <tr><th className="col-vendor">Satıcı</th><th className="num">Evrak No</th><th className="num">Tarih</th><th className="num">Gider hesabı</th><th className="num">Toplam</th><th className="col-status">Durum</th></tr>
            </thead>
            <tbody>
              {receipts.map((r) => {
                const notes = r.status === "draft" ? r.warnings.length : 0;
                return (
                  <tr key={r.id}>
                    <td className="r-vendor">
                      <Link className="row-link" href={`${base}/fis/${r.id}`} title={r.vendorName ?? undefined}>{r.vendorName ?? "Okunamayan fiş"}</Link>
                      {notes ? <span className="r-notes">{notes} uyarı</span> : null}
                    </td>
                    <td className="r-no num" translate="no">{r.receiptNo ?? <span className="dash">-</span>}</td>
                    <td className="r-date num">{trDate(r.receiptDate) ?? <span className="dash">Tarih yok</span>}</td>
                    <td className="r-code num" translate="no">{r.expenseCode ?? <span className="dash">-</span>}</td>
                    <td className="r-total num">{r.totalKurus === null ? <span className="dash">-</span> : <>{formatTrAmount(r.totalKurus)}<span className="unit">&nbsp;TL</span></>}</td>
                    <td className="r-status"><span className={`status status-${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tab.status === "exported" && receipts.length > 0 ? (
          <div className="list-foot desktop-only">
            {/* shortcut: re-downloads only the newest 50 (one Luca file); older ones are re-downloaded one by one from the receipt page. */}
            <ExportButton receiptIds={receipts.slice(0, 50).map((r) => r.id)}
              label={receipts.length > 50 ? "Son 50 fişi tekrar indir" : "Bu listeyi tekrar indir"} />
          </div>
        ) : null}
      </section>

      <aside className="side" aria-label="Luca'ya aktarım">
        <section className="panel side-block desktop-only" aria-labelledby="luca-title">
          <div className="side-head">
            <h2 id="luca-title">Luca dosyası</h2>
            <p className="muted small">{ready.length ? `${ready.length} onaylı fiş${files > 1 ? `, ${files} dosya` : ""}` : "Hazır fiş yok"}</p>
          </div>
          <LucaMeter label="Fiş" value={ready.length} max={MAX_RECEIPTS_PER_FILE} />
          <LucaMeter label="Satır" value={readyLines} max={MAX_LINES_PER_FILE} />
          {ready.length ? <ExportButton label="Luca için indir" /> : <p className="muted small">Onayladığınız fişler bu dosyaya girer.</p>}
          <details className="howto">
            <summary>Luca&apos;da yükleme adımları</summary>
            <ol className="guide">
              <li>Luca&apos;da Muhasebe, Fiş İşlemleri, Excel veri aktarımı ekranını açın.</li>
              <li>Dosyayı seçin, doğrulama kodunu yazıp Yükle&apos;ye basın.</li>
              <li>Önizlemeyi kontrol edip Fiş Kes ile fişleri oluşturun.</li>
            </ol>
            <p className="muted small">İndirilen fişler Aktarıldı olur. Luca dosyayı reddederse Aktarıldı sekmesinden tekrar indirin. Dosya düzeni Luca&apos;nın resmi şablonuyla henüz doğrulanmadı; ilk yüklemede önizlemedeki kodları ve tutarları fişle karşılaştırın.</p>
          </details>
        </section>

        {byAccount.length ? (
          <section className="panel side-block desktop-only" aria-labelledby="hesap-title">
            <div className="side-head">
              <h2 id="hesap-title">Gider hesaplarına göre</h2>
              <p className="muted small">{SCOPES[tab.slug] ?? "Tüm fişler"}, matrah</p>
            </div>
            <ol className="by-account">
              {byAccount.slice(0, 5).map(([code, kurus]) => (
                <li key={code}>
                  <span className="acc-name"><span className="tnum" translate="no">{code}</span> <span className="muted">{accountNames[code] ?? ""}</span></span>
                  <span className="num to-luca">{formatTrAmount(kurus)}</span>
                  <span className="acc-track" aria-hidden="true"><span className="acc-bar" style={{ transform: `scaleX(${kurus / byAccount[0][1]})` }} /></span>
                </li>
              ))}
            </ol>
            {byAccount.length > 5 ? <p className="muted small">ve {byAccount.length - 5} hesap daha</p> : null}
            {/* The VAT side of the same receipts, apart from the expense accounts above. */}
            <p className="by-account-foot">
              <span><span className="tnum" translate="no">191</span> <span className="muted">İndirilecek KDV</span></span>
              <span className="num to-luca">{formatTrAmount(vatTotal)}</span>
            </p>
          </section>
        ) : null}

        <div className="phone-only"><InstallHint /></div>
      </aside>
    </main>
  );
}
