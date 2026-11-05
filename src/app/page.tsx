import type { Metadata } from "next";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { CookieNote } from "@/components/site/CookieNote";
import { SiteBar } from "@/components/site/SiteBar";
import { Counter } from "@/components/home/Counter";
import { Faq, type Qa } from "@/components/home/Faq";
import { AppWindow } from "@/components/home/Frames";
import { HomeMotion } from "@/components/home/HomeMotion";
import { ShowRow, type Piece } from "@/components/home/ShowRow";
import { AKARYAKIT, journalFor, KAFE, SAMPLES, shownAccountName, sourcesFor, type Sample } from "@/components/home/samples";
import { Spotlight } from "@/components/home/Spotlight";
import { Thermal } from "@/components/home/Thermal";
import { WARNING_MESSAGES } from "@/lib/journal";
import { formatTrAmount } from "@/lib/money";
import { PAYMENT_ALTERNATIVES } from "@/lib/default-rules";
import "@/components/home/home.css";
// Two licensed photographs of the receipt's own material (YON 23.20); credited in the footer.
import posStrip from "../../public/gorseller/pos-fis-seridi.webp";
import paperRolls from "../../public/gorseller/termal-rulo.webp";

// Public and static: no session, no user data (docs/design/YON.md 5.5).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "Accountie: yazar kasa fişinden Luca yevmiye kaydı" },
  description: "Yazar kasa fişini telefonla çekin, Luca Fiş Detayı satırları hesap planınıza göre hazırlansın. Kontrol edip onaylayın, Excel ile Luca'ya aktarın.",
};

const cssVars = (v: Record<string, string | number>) => v as CSSProperties;

type Line = { code: string; name: string; debit: string; credit: string };
/** A sample's Luca lines as the page prints them: the product's own journal with the default rules (partner card unless cash). */
const linesOf = (s: Sample, pay: "partner" | "cash" = "partner"): Line[] => journalFor(s, pay).lines.map((l) => ({
  code: l.accountCode, name: shownAccountName(l.accountName),
  debit: l.debitKurus ? formatTrAmount(l.debitKurus) : "", credit: l.creditKurus ? formatTrAmount(l.creditKurus) : "",
}));
// Every slot reads its own receipt (YON 23.15): the hero counter 0047, the path a café 0331, the signature a fuel receipt 1185,
// the showcase Market 2214 and others, the Excel file the two approved fişler of the list.
const LINES_0047 = linesOf(SAMPLES[0]);
const LINES_KAFE = linesOf(KAFE);
const LINES_FUEL = linesOf(AKARYAKIT);
const LINES_KIRTASIYE = linesOf(SAMPLES[1], "cash");

/** A sample's Luca lines; `credit` replaces the credit amount (the misread receipt), `mark` adds a note to one line. */
function MiniLines({ lines, credit, mark, lit }: { lines: Line[]; credit?: string; mark?: { code: string; node: ReactNode }; lit?: string }) {
  return (
    <table className="ui-table">
      <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.code} data-lit={l.code === lit || undefined}>
            <td><span className="code" translate="no">{l.code}</span><span className="code-name">{l.name}</span>{mark?.code === l.code ? mark.node : null}</td>
            <td className="num to-luca">{l.debit}</td>
            <td className={`num to-luca${credit && l.credit ? " balance-off" : ""}`}>{credit && l.credit ? credit : l.credit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


/** Where each of fiş 1185's three amounts is printed on the strip (Thermal data-amt): base, TOPKDV, TOPLAM. */
const FLY_FROM = ["base", "vat", "total"];

/** A Luca cell in the signature scene: the real figure, a dash that holds its place, and the aria-hidden copy that flies in. */
function FlyCell({ value, from }: { value: string; from: string }) {
  return (
    <span className="fly-cell">
      <span className="fly-dash" aria-hidden="true" />
      <span className="fly-val">{value}</span>
      <span className="fly-copy" aria-hidden="true" data-fly={from}><span className="fly-y"><span className="fly-s">{value}</span></span></span>
    </span>
  );
}
const Dash = () => <span className="fly-cell"><span className="fly-dash fly-dash-empty" aria-hidden="true" /></span>;

/** The showcase reads a different receipt than the hero and the signature: Market 2214, two VAT rates, so two expense and two 191 lines. */
const MARKET = SAMPLES[2];
const MARKET_READ = [
  { id: "satici", label: "Satıcı", value: MARKET.receipt.vendorName ?? "" },
  { id: "evrak", label: "Evrak No", value: MARKET.receipt.receiptNo ?? "" },
  ...MARKET.receipt.vatLines.flatMap((v) => [
    { id: `brut${v.rate}`, label: `%${v.rate} toplam`, value: formatTrAmount(v.grossKurus) },
    { id: `kdv${v.rate}`, label: `KDV %${v.rate}`, value: formatTrAmount(v.vatKurus ?? 0) },
  ]),
  { id: "toplam", label: "Toplam", value: formatTrAmount(MARKET.receipt.totalKurus ?? 0) },
  { id: "odeme", label: "Ödeme", value: "KREDİ KARTI" },
];
const MARKET_FROM = sourcesFor(MARKET).map((src) => (src.kind === "total" ? ["toplam", "odeme"] : src.kind === "vat" ? [`kdv${src.rate}`] : [`brut${src.rate}`, `kdv${src.rate}`]));
const MARKET_LINES = journalFor(MARKET, "partner").lines.map((l, i) => ({
  code: l.accountCode, name: shownAccountName(l.accountName),
  debit: l.debitKurus ? formatTrAmount(l.debitKurus) : "", credit: l.creditKurus ? formatTrAmount(l.creditKurus) : "", from: MARKET_FROM[i] ?? [],
}));

/** The Fişler window's rows: invented sample vendors in the ÖRNEK form, statuses mixed as a real list is. */
const LIST = [
  ["0047", "ÖRNEK BALIK LOKANTASI", "05.09.2026", "8.725,00", "Onaylı"],
  ["2214", "ÖRNEK MARKET", "04.09.2026", "598,50", "Onaylı"],
  ["0768", "ÖRNEK OTOPARK", "06.09.2026", "120,00", "Taslak"],
  ["1185", "ÖRNEK AKARYAKIT", "03.09.2026", "2.150,00", "Taslak"],
  ["0912", "ÖRNEK KIRTASİYE", "02.09.2026", "480,00", "Aktarıldı"],
  ["0331", "ÖRNEK KAFE", "01.09.2026", "265,00", "Aktarıldı"],
];

const PIECES: Piece[] = [
  {
    name: "Fiş ve satırlar", screen: "Fiş 2214, kontrol",
    text: "Fişten okunan alanlar ve Luca satırları aynı ekranda. Hesap kodu, tutar, Evrak No ve BT orada düzeltilir.",
    body: (
      <Spotlight meta="Evrak No 2214, 04.09.2026, BT ÖK. Her KDV oranı kendi satırını açar." read={MARKET_READ} lines={MARKET_LINES} />
    ),
  },
  {
    name: "Alacak hesabı", screen: "Fiş 0331, alacak hesabı",
    text: "Ortağın kartıyla ödendiyse 331.01, şirket kartıysa 309.01. Tek seçimle değişir.",
    body: (
      <div className="ui-card ui-split">
        <div className="ui-menu-wrap">
          <p className="ui-label">Alacak hesabı</p>
          <p className="ui-select">331.01 Ortaklara Borçlar</p>
          <ul className="ui-menu">
            {PAYMENT_ALTERNATIVES.map((a) => (
              <li key={a.code} data-selected={a.code === "331.01" || undefined}>
                <span className="code" translate="no">{a.code}</span> {a.name}{a.code === "309.01" ? <span className="ui-meta">şirket kartı</span> : null}
              </li>
            ))}
          </ul>
        </div>
        <MiniLines lines={LINES_KAFE} lit="331.01" />
      </div>
    ),
  },
  {
    name: "Uyarı notları", screen: "Fiş 0047, notlar",
    text: "Binek araç, ağırlama ve eski KDV oranı satırın yanında not olarak durur, onayı engellemez.",
    body: (
      <div className="ui-card ui-split">
        <MiniLines lines={LINES_0047} mark={{ code: "770.08", node: <span className="pill pill-warn">Ağırlama</span> }} />
        <div className="ui-notes">
          <p><span className="pill pill-warn">Ağırlama</span> {WARNING_MESSAGES.meal}</p>
          <p><span className="pill pill-warn">Binek araç</span> {WARNING_MESSAGES.vehicle}</p>
          <p><span className="pill pill-warn">Eski oran</span> {WARNING_MESSAGES.legacy_rate}</p>
        </div>
      </div>
    ),
  },
  {
    name: "Luca dosyası", screen: "Fişler, ikinci dosya",
    text: "Accountie onaylı fişleri 50 fiş ya da 400 satırda yeni dosyaya geçerek yazar; bir fiş iki dosyaya bölünmez.",
    body: (
      <div className="ui-card ui-file">
        {/* The panel's own Luca card (ReceiptListView) after the first of two downloads: 88 approved, the first file took 50. */}
        <p className="ui-file-head"><span>Luca dosyası</span><span className="ui-meta">88 onaylı fiş, ikinci dosya</span></p>
        <div className="ui-meter"><span>Fiş</span><span className="ui-track"><span style={{ transform: "scaleX(0.76)" }} /></span><span className="num">38 / 50</span></div>
        <div className="ui-meter"><span>Satır</span><span className="ui-track"><span style={{ transform: "scaleX(0.74)" }} /></span><span className="num">296 / 400</span></div>
        <span className="btn">Luca için indir</span>
        <p className="ui-meta">İlk 50 fiş birinci dosyaya yazıldı; kalan 38 fiş bu dosyada. Luca bir dosyada en fazla 50 fiş alır.</p>
        <ol className="ui-steps">
          <li>Luca’da Muhasebe, Fiş İşlemleri, Excel veri aktarımı ekranını açın.</li>
          <li>Dosyayı seçin, doğrulama kodunu yazıp Yükle’ye basın.</li>
          <li>Önizlemeyi kontrol edip Fiş Kes ile fişleri oluşturun.</li>
        </ol>
      </div>
    ),
  },
  {
    name: "Eklenti uyarısı", screen: "Luca Fiş Detayı, fiş 0912",
    text: "Açık Fiş Detayı ekranına satırları yazmayı dener. Luca’da henüz denenmedi; birincil yol Excel aktarımıdır.",
    body: (
      <div className="ui-card ui-split">
        <div className="ui-ext">
          <p className="ui-ext-head"><BrandMark /> Accountie</p>
          <ul className="ui-files">
            {LINES_KIRTASIYE.map((l, i) => (
              <li key={l.code}><span>{i + 1}. satır <span translate="no">{l.code}</span></span><span className="ui-meta">Yazıldı</span></li>
            ))}
            <li><span>1. satır BT</span><span className="balance-off">Bulunamadı</span></li>
          </ul>
        </div>
        <div className="ui-ext">
          <p className="ui-warn">Alan bulunamadı: 1. satır BT. Bu alanları elle doldurun, sonra Kaydet’e siz basın.</p>
          <p className="ui-meta">Eklenti bulamadığı alanı tahmin etmez.</p>
        </div>
      </div>
    ),
  },
];

const NOTES = [
  { name: "Kategoriden gider hesabı", text: "Yemek ve ağırlama 770.08’e, akaryakıt 770.01’e yazılır. Kodları kendi planınıza göre değiştirin." },
  { name: "Orandan KDV hesabı", text: "%1, %10 ve %20 için ayrı 191 hesabı. Çok oranlı fişte her oran kendi satırını açar." },
  { name: "Ödemeden alacak hesabı", text: "Nakit 100.01 Kasa’ya, ortağın kartı 331.01 Ortaklara Borçlar’a, şirket kartı 309.01 Diğer Mali Borçlar’a. Fiş bazında tek seçimle değişir." },
  { name: "Belge türü", text: "Büronuzun Luca’daki BT kodu neyse o. Varsayılan ÖK." },
  { name: "Kod biçimi", text: "770.08 gibi üç hane ve noktalı alt hesaplar kabul edilir. 770-07 gibi hatalı kod kaydedilmez." },
  { name: "Yalnız yeni fişler", text: "Kural değişikliği kayıtlı satırları değiştirmez, sonraki fişlere uygulanır." },
];

function RulePart({ n }: { n: number }) {
  const row = (label: string, code: string, name: string) => (
    <div className="ui-rule" key={label}>
      <span className="ui-rule-label">{label}</span>
      <span className="field ui-code" translate="no">{code}</span>
      <span className="ui-rule-name">{name}</span>
    </div>
  );
  switch (n) {
    case 1: return <>{row("Yemek ve ağırlama", "770.08", "Yeme-İçme ve Ağırlama Giderleri")}{row("Akaryakıt", "770.01", "Akaryakıt Giderleri")}{row("Kırtasiye", "770.02", "Kırtasiye Giderleri")}</>;
    case 2: return <>{row("%1 KDV", "191.03.01", "%1 İndirilecek KDV")}{row("%10 KDV", "191.03.10", "%10 İndirilecek KDV")}{row("%20 KDV", "191.03.20", "%20 İndirilecek KDV")}</>;
    case 3: return <>{row("Nakit", "100.01", "Kasa")}{row("Ortağın kartı", "331.01", "Ortaklara Borçlar")}{row("Şirket kartı", "309.01", "Diğer Mali Borçlar")}</>;
    case 4: return row("Belge türü (BT)", "ÖK", "Luca belge türü");
    case 5: return (
      <div className="ui-rule">
        <span className="ui-rule-label">Bakım ve onarım</span>
        <span className="field ui-code ui-code-bad" translate="no">770-07</span>
        <span className="field-error">Kod 770.07 biçiminde olmalı.</span>
      </div>
    );
    default: return (
      <div className="ui-save">
        <span className="ui-meta">Kayıtlı fişler değişmez.</span>
        <span className="btn btn-primary btn-sm">Kuralları kaydet</span>
      </div>
    );
  }
}
const PART_TITLES = ["Gider hesapları", "KDV hesapları", "Ödeme ve alacak", "Belge türü", "Kod biçimi", "Kaydet"];

const ROUTES: { group: string; rows: [string, string][] }[] = [
  { group: "Excel veri aktarımı", rows: [["Onaylı fişler tek dosyada", ".xlsx"], ["Yeni dosyaya geçiş", "50 fiş ya da 400 satır"], ["Bir fiş", "İki dosyaya bölünmez"], ["Evrak No metin hücresi", "0047 korunur"], ["İndirilen fişler", "Aktarıldı olur"]] },
  { group: "Pano", rows: [["Tek fişin satırları", "Fiş Detayı sırasında"], ["Kolonlar", "Hesap, Evrak No, Tarih, BT, Açıklama, Borç, Alacak"]] },
  { group: "Chrome eklentisi, deneysel", rows: [["Açık Fiş Detayı ekranını doldurur", "Kaydet sizde"], ["Luca ekranıyla", "Henüz denenmedi"]] },
  { group: "Luca’da", rows: [["Muhasebe, Fiş İşlemleri", "Excel veri aktarımı"], ["Dosya, doğrulama kodu", "Yükle"], ["Önizleme", "Fiş Kes"]] },
];

const FAQ: Qa[] = [
  { q: "Fiş fotoğrafı nereye gidiyor?", a: "Okunmak için yapay zeka hizmetine (Anthropic, ABD) gönderilir. Accountie fotoğrafı sunucuda saklamaz; kontrol ekranındaki görüntü yalnız sizin cihazınızda durur." },
  { q: "Luca’ya kendisi mi kaydediyor?", a: "Hayır. Excel dosyasını Luca’ya siz yüklersiniz; eklenti satırları doldurur, Kaydet’e basmaz. Onayınız olmadan kayıt oluşmaz." },
  { q: "Hangi belgeler okunuyor?", a: "Yazar kasa (ÖKC) fişleri. Fatura, e-Arşiv ve gider pusulası şimdilik okunmuyor." },
  { q: "KDV’yi yeniden hesaplıyor mu?", a: "Hayır. Matrah, toplamdan fişte yazan KDV düşülerek bulunur. KDV okunamazsa orandan hesaplanır ve satıra not düşülür." },
  { q: "Okuma yanlış çıkarsa?", a: "Okunamayan alan boş kalır ve işaretlenir. Toplam ile KDV tutmazsa fiş bir kez daha okunur, yine tutmazsa uyarıyla size gelir." },
  { q: "Hesap kodlarını kim seçiyor?", a: "Siz. Yapay zeka yalnız kategori önerir; hesap kodu kendi kural tablonuzdan gelir." },
  { q: "Ücretli mi?", a: "Fiyat henüz belirlenmedi. Ücretlendirme başlamadan önce hesabınızdaki e-postaya haber verilir." },
  { q: "Kişisel verilerim nasıl işleniyor?", a: "Hangi verinin hangi hizmete gittiği ve neyin saklandığı gizlilik sayfasında yazılı. Bağlantısı sayfanın altında." },
  { q: "Telefonda uygulama gibi açılır mı?", a: "Evet. Ana ekrana eklediğinizde ayrı bir uygulama gibi açılır, Fiş çek tek dokunuştur." },
];

// Bir fişin yolu follows a café receipt, and each state is a different object (YON 23.15): the viewfinder with the paper on the
// desk, the read fields, the approved lines with their balance, the Excel file.
const PATH = [
  { clause: "Önce telefonla çekilir.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0331</span><span className="status" data-step>Çekildi</span></p>
      <div className="cam path-cam">
        <span className="cam-c cam-c1" /><span className="cam-c cam-c2" /><span className="cam-c cam-c3" /><span className="cam-c cam-c4" />
        <Thermal sample={KAFE} printedPayment="KREDİ KARTI" compact />
      </div>
      <p className="ui-meta" data-step>Accountie fotoğrafı saklamaz.</p>
    </>
  ) },
  { clause: "Sonra fiş okunur.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0331</span><span className="status" data-step>Taslak</span></p>
      {/* The read: the paper beside the fields taken from it, as the panel's review screen sets them. */}
      <div className="path-read" data-step>
        <div className="path-read-paper"><Thermal sample={KAFE} printedPayment="KREDİ KARTI" hot={{ kind: "total" }} compact /></div>
        <div className="path-read-fields">
          {[["Satıcı", "ÖRNEK KAFE"], ["Evrak No", "0331"], ["Tarih", "01.09.2026"], ["KDV %10", "24,09"], ["Toplam", "265,00"], ["Ödeme", "KREDİ KARTI"], ["Kategori", "Yemek ve ağırlama"]].map(([k, v]) => (
            <p className="ui-kv" key={k}><span>{k}</span><span className="from-receipt">{v}</span></p>
          ))}
        </div>
      </div>
    </>
  ) },
  { clause: "Ardından siz onaylarsınız.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0331</span><span className="status status-approved" data-step>Onaylandı</span></p>
      <MiniLines lines={LINES_KAFE} />
      <dl className="ui-totals path-totals" data-step>
        <div><dt>Borç</dt><dd>265,00</dd></div>
        <div><dt>Alacak</dt><dd>265,00</dd></div>
        <div><dt>Fark</dt><dd>0,00</dd></div>
      </dl>
      <div className="ui-approve" data-step>
        <span className="btn btn-primary">Onaylandı</span>
        <span className="ui-reason balance-ok">Dengede. Evrak No 0331, BT ÖK</span>
      </div>
    </>
  ) },
  { clause: "En son Excel ile Luca’ya yüklenir.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0331</span><span className="status status-exported" data-step>Aktarıldı</span></p>
      <p className="path-file" data-step><span className="ui-file-name">luca-fisler-20260901.xlsx</span><span>1 fiş, 3 satır</span></p>
      {/* The file as a spreadsheet opens it: column letters, row numbers, the export's header row, the lines, then the empty grid. */}
      <table className="path-xl" data-step>
        <thead><tr><td />{["A", "B", "C", "D", "E"].map((c) => <th scope="col" key={c} className={c === "C" ? "path-xl-date" : undefined}>{c}</th>)}</tr></thead>
        <tbody>
          <tr className="path-xl-head"><th scope="row">1</th><td>Hesap Kodu</td><td>Evrak No</td><td className="path-xl-date">Fiş Tarihi</td><td className="num">Borç</td><td className="num">Alacak</td></tr>
          {LINES_KAFE.map((l, i) => (
            <tr key={l.code}><th scope="row">{i + 2}</th><td translate="no">{l.code}</td><td>0331</td><td className="path-xl-date">01.09.2026</td><td className="num to-luca">{l.debit}</td><td className="num to-luca">{l.credit}</td></tr>
          ))}
          {[5, 6, 7, 8].map((n) => <tr key={n} aria-hidden="true"><th scope="row">{n}</th><td /><td /><td className="path-xl-date" /><td /><td /></tr>)}
        </tbody>
      </table>
      <p className="ui-meta" data-step>Luca’da Excel veri aktarımı ile yüklenir, Fiş Kes ile kaydedilir.</p>
    </>
  ) },
];

/** The Excel file of the routes section: the export's own columns for the list's two approved fişler, 0047 and 2214 (8 lines). */
const SHEET = [
  { no: "1", date: "05.09.2026", evrak: "0047", lines: LINES_0047 },
  { no: "2", date: "04.09.2026", evrak: "2214", lines: linesOf(SAMPLES[2]) },
].flatMap((f) => f.lines.map((l) => ({ ...f, l })));

export default function LandingPage() {
  return (
    <>
      <HomeMotion />
      <SiteBar />
      <main id="icerik" tabIndex={-1} className="home">
        {/* Hero: two tones, the counter is the picture */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            {/* Painted whole on the first frame (YON 23.15): no line mask, so no half-cut glyphs while the page hydrates. */}
            <h1 className="hero-title" id="hero-title"><span className="hero-line">Fişten Luca’ya</span> <span className="hero-line">yevmiye kaydı</span></h1>
            <p className="hero-sub" data-load style={cssVars({ "--d": "420ms" })}>
              Yazar kasa fişini telefonla çekin; gider, KDV ve alacak satırları sizin hesap kodlarınızla hazırlanır, siz onaylayınca Excel ile Luca’ya aktarırsınız.
            </p>
            <p data-load style={cssVars({ "--d": "480ms" })}>
              <Link className="btn btn-primary btn-lg" href="/kayit">Hesap oluştur</Link>
            </p>
          </div>
          <div className="hero-stage">
            <div className="hero-counter"><Counter /></div>
          </div>
        </section>

        {/* The material (YON 23.20): one photograph across the width, the paper the product starts from, and one sentence. */}
        <section className="paper" aria-labelledby="paper-title">
          <figure className="photo paper-photo">
            <Image src={posStrip} alt="Ödeme cihazından çıkan uzun, boş termal fiş şeridi, turuncu bir masanın üstünde" sizes="100vw" />
          </figure>
          <div className="paper-copy">
            <h2 className="t-head paper-title" id="paper-title">Termal fiş solar</h2>
            <p className="paper-text">Yazar kasa fişi ısıyla basılır ve zamanla okunmaz olur. Fiş okunurken satırlarını çıkarın; kayıt Luca’da kalır.</p>
          </div>
        </section>

        {/* how-it-works: on desktop a sticky split story (four clauses, one card through four states, the field wiped in from
            below, YON.md 23.3.4); without script, below 1100px and with reduced motion the four cards stand in their own fields. */}
        <Suspense>
        <section className="path" aria-labelledby="path-title">
          <h2 className="t-head path-title" id="path-title">Bir fişin yolu</h2>
          {PATH.map((f, i) => (
            <div className={`path-field path-field-${i + 1}`} key={f.clause} data-n={i + 1} data-on={i === 0 || undefined}>
              <p className="path-clause"><span>{f.clause}</span></p>
              <div className="path-plate"><div className="ui-card path-card" data-ui>{f.card}</div></div>
            </div>
          ))}
          <div className="path-stage" aria-hidden="true" data-active="1">
            {[1, 2, 3, 4].map((n) => <span key={n} className={`path-bg path-bg-${n}`} />)}
            {/* One card through four states: the shell and its head stay, the pill rolls, only the body under it changes. */}
            <div className="ui-card path-shell" data-ui>
              <p className="ui-card-head"><span>Fiş 0331</span>
                <span className="path-pill">
                  <span className="status" data-s="1">Çekildi</span><span className="status" data-s="2">Taslak</span>
                  <span className="status status-approved" data-s="3">Onaylandı</span><span className="status status-exported" data-s="4">Aktarıldı</span>
                </span>
              </p>
            </div>
          </div>
        </section>
        </Suspense>

        {/* The signature (YON.md 23.3.1): in the control window the receipt's base, VAT and total lift off the paper and land in
            their Luca cells, codes come in, the balance closes and Onayla opens. Server output is the end state. */}
        <Suspense>
        <section className="rule" aria-labelledby="rule-title" data-scene="rule">
          <div className="rule-track">
            <div className="rule-stick wrap">
              <h2 className="t-head rule-title" id="rule-title">Borç alacağa eşit olmadan onay yok</h2>
              <div className="rule-copy">
                <p className="rule-sub">Fişten okunan matrah, KDV ve toplam kendi hesap satırına iner. Borç alacağa eşit olunca Onayla açılır.</p>
                <ul className="rule-map">
                  <li><span>Matrah</span><span translate="no">770.01 borç</span></li>
                  <li><span>TOPKDV</span><span translate="no">191.03.20 borç</span></li>
                  <li><span>TOPLAM</span><span translate="no">331.01 alacak</span></li>
                </ul>
              </div>
              <AppWindow title="Fiş 1185, kontrol" className="rule-win">
                <div className="rule-body">
                  <div className="rule-receipt"><Thermal sample={AKARYAKIT} printedPayment="KREDİ KARTI" base /></div>
                  <div className="rule-ledger">
                    <table className="ui-table rule-table">
                      <caption className="visually-hidden">Fiş 1185 için Luca satırları</caption>
                      <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
                      <tbody>
                        {LINES_FUEL.map((l, i) => (
                          <tr key={l.code} style={cssVars({ "--n": i })}>
                            <td><span className="rule-code"><span className="code" translate="no">{l.code}</span><span className="code-name">{l.name}</span></span></td>
                            <td className="num to-luca">{l.debit ? <FlyCell value={l.debit} from={FLY_FROM[i]} /> : <Dash />}</td>
                            <td className="num to-luca">{l.credit ? <FlyCell value={l.credit} from={FLY_FROM[i]} /> : <Dash />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="rule-close">
                      <dl className="ui-totals">
                        <div><dt>Borç</dt><dd>2.150,00</dd></div>
                        <div><dt>Alacak</dt><dd>2.150,00</dd></div>
                        <div><dt>Fark</dt><dd>0,00</dd></div>
                      </dl>
                      <div className="ui-approve">
                        <span className="rule-btn"><span className="btn" aria-hidden="true">Onayla</span><span className="btn btn-primary">Onayla</span></span>
                        <span className="ui-reason balance-ok">Dengede</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AppWindow>
            </div>
          </div>
          {/* After the scene, one figure at the page's largest size (YON 23.15): the same fiş read wrong. The card sits on the
              figure's end, so "open when equal, closed when not" reads in one frame, out of the page's split layout. */}
          <div className="rule-after wrap">
            <p className="rule-gap" aria-hidden="true">360,00</p>
            <p className="rule-note"><span className="balance-off">Fark 360,00.</span> Fişte toplam 2.150,00 iken alacak 2.510,00 okunursa fark görünür ve Onayla kapalı kalır. Tutarı fişe göre düzeltince onay açılır.</p>
            <div className="rule-proof" data-ui>
              <div className="ui-card rule-card">
                <p className="ui-card-head"><span translate="no">ÖRNEK AKARYAKIT</span><span className="status">Taslak</span></p>
                <MiniLines lines={LINES_FUEL} credit="2.510,00" />
                <dl className="ui-totals">
                  <div><dt>Borç</dt><dd>2.150,00</dd></div>
                  <div><dt>Alacak</dt><dd>2.510,00</dd></div>
                  <div><dt>Fark</dt><dd className="balance-off">360,00</dd></div>
                </dl>
                <div className="ui-approve">
                  <span className="btn btn-off">Onayla<span className="visually-hidden"> (kapalı)</span></span>
                  <span className="ui-reason">Fişte toplam 2.150,00. Alacak satırını düzeltin.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        </Suspense>

        {/* showcase: lit panel, dark row */}
        <Suspense>
        <section className="show" aria-labelledby="show-title">
          <div className="show-inner wrap">
            <h2 className="t-head show-title" id="show-title">Kontrol ekranından Luca’ya</h2>
            <ShowRow pieces={PIECES} />
          </div>
        </section>
        </Suspense>

        {/* features: panel with margin notes, each note on the row of the part it explains; nothing in the panel is editable */}
        <Suspense>
        <section className="feat wrap" aria-labelledby="feat-title">
          <h2 className="t-head feat-title" id="feat-title">Sizin hesap planınız</h2>
          <div className="feat-panel" data-ui aria-label="Örnek hesap kuralları paneli" role="group">
            <p className="ui-panel-head">Hesap kuralları</p>
            {PART_TITLES.map((t, i) => (
              <div className="feat-part" data-part={i + 1} key={t} style={{ gridRow: i + 2 }}>
                <p className="ui-part-title">{t}</p>
                <RulePart n={i + 1} />
              </div>
            ))}
          </div>
          {NOTES.map((n, i) => (
            <div className="feat-note" data-note={i + 1} key={n.name} style={{ gridRow: i + 3 }}>
              <h3 className="feat-note-name">{n.name}</h3>
              <p className="feat-note-text">{n.text}</p>
            </div>
          ))}
        </section>
        </Suspense>

        {/* list: two-ended rows, and the Fişler window the file comes out of */}
        <Suspense>
        <section className="routes wrap" aria-labelledby="routes-title">
          <div className="routes-list">
            <h2 className="t-head" id="routes-title">Excel ya da pano ile Luca’ya</h2>
            {ROUTES.map((g) => (
              <div className="routes-group" key={g.group}>
                <h3 className="routes-group-name">{g.group}</h3>
                <ul>
                  {g.rows.map(([name, value]) => (
                    <li key={name}><span className="routes-name">{name}</span><span className="routes-value">{value}</span></li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="routes-tip">İlk aktarımı tek fişle deneyin: Luca’nın önizlemesinde satırları kontrol edip Fiş Kes’e basın.</p>
          </div>
          <div className="routes-aside">
            <AppWindow title="Fişler" className="routes-win">
              <div className="routes-app">
                <table className="ui-table routes-table">
                  <caption className="visually-hidden">Örnek fiş listesi</caption>
                  <thead><tr><th scope="col">Fiş</th><th scope="col">Satıcı</th><th scope="col" className="num">Tutar</th><th scope="col">Durum</th></tr></thead>
                  <tbody>
                    {LIST.map(([no, vendor, date, amount, state]) => (
                      <tr key={no}>
                        <td>{no}</td>
                        <td><span className="routes-vendor" translate="no">{vendor}</span><span className="code-name">{date}</span></td>
                        <td className="num">{amount}</td>
                        <td><span className={`status${state === "Onaylı" ? " status-approved" : state === "Aktarıldı" ? " status-exported" : ""}`}>{state}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="routes-luca">
                  <p className="ui-file-head"><span>Luca dosyası</span></p>
                  <p className="ui-meta">2 onaylı fiş</p>
                  <div className="ui-meter"><span>Fiş</span><span className="ui-track"><span style={{ transform: "scaleX(0.04)" }} /></span><span className="num">2 / 50</span></div>
                  <div className="ui-meter"><span>Satır</span><span className="ui-track"><span style={{ transform: "scaleX(0.02)" }} /></span><span className="num">8 / 400</span></div>
                  <span className="btn btn-sm">Luca için indir</span>
                </div>
              </div>
            </AppWindow>
            {/* The file Luca reads: the export's own columns (src/lib/luca/export.ts) for the two approved fişler, leaving the window. */}
            <div className="ui-card routes-file" data-ui>
              <p className="ui-card-head"><span className="ui-file-name">luca-fisler-20260905.xlsx</span><span className="ui-meta">Fişler sayfası</span></p>
              {/* On a phone the identifier columns step aside so the amounts stay whole; a narrower screen still scrolls, so the region is a keyboard stop (WCAG 2.1.1). */}
              <div className="routes-file-scroll" tabIndex={0} role="region" aria-label="Luca Excel dosyasının satırları">
                <table className="ui-sheet">
                  <thead><tr>{["Fiş No", "Fiş Tarihi", "Hesap Kodu", "Evrak No", "Borç", "Alacak", "Belge Türü"].map((c) => <th scope="col" key={c} className={c === "Borç" || c === "Alacak" ? "num" : c === "Hesap Kodu" || c === "Belge Türü" ? undefined : "sheet-id"}>{c}</th>)}</tr></thead>
                  <tbody>
                    {SHEET.map(({ no, date, evrak, l }, i) => (
                      <tr key={i} data-first={(i > 0 && SHEET[i - 1].no !== no) || undefined}><td className="sheet-id">{no}</td><td className="sheet-id">{date}</td><td translate="no">{l.code}</td><td className="sheet-id">{evrak}</td><td className="num to-luca">{l.debit}</td><td className="num to-luca">{l.credit}</td><td>ÖK</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
        </Suspense>

        {/* faq: question index, one answer */}
        <Suspense>
        <section className="faq wrap" aria-labelledby="sss-title" id="sss">
          <Faq items={FAQ} titleId="sss-title" />
        </section>
        </Suspense>

        {/* cta: one action, beside the machine the receipt comes from */}
        <Suspense>
        <section className="cta" aria-labelledby="cta-title">
          <div className="cta-inner wrap">
            <div className="cta-copy">
              <h2 className="t-display cta-title" id="cta-title"><span>İlk fişinizi</span> <span>çekin</span></h2>
              <p className="cta-sub">Hesabı açtığınızda varsayılan hesap planı kural tablonuza kopyalanır. İlk fişi telefonla çekip kontrol ekranında görürsünüz.</p>
              <div className="cta-actions">
                <Link className="btn btn-lg cta-btn" href="/kayit" prefetch={false}>Hesap oluştur</Link>
                <p>Hesabınız var mı? <Link href="/giris" prefetch={false}>Giriş yapın</Link></p>
              </div>
            </div>
            <figure className="cta-figure">
              <div className="cta-pic">
                <div className="photo cta-photo">
                  <Image src={paperRolls} alt="Elde tutulan iki rulo termal yazar kasa kâğıdı" sizes="(max-width: 900px) 100vw, 520px" />
                </div>
                {/* Kırtasiye 0912 paid in cash: the lines this paper becomes, as sharp chips over the photograph (Pennylane, YON 23.2). */}
                <ul className="cta-chips" data-ui>
                  {LINES_KIRTASIYE.map((l) => (
                    <li key={l.code}><span translate="no">{l.code}</span><span className="to-luca">{l.debit || l.credit}</span></li>
                  ))}
                  <li className="balance-ok">Dengede</li>
                </ul>
              </div>
              <figcaption>Fiş 0912, nakit: rulodan çıkan fiş Luca’da üç satır olur.</figcaption>
            </figure>
          </div>
        </section>
        </Suspense>
      </main>

      <footer className="foot wrap">
        <div className="foot-top">
          <p className="foot-what"><span translate="no">Accountie</span>, yazar kasa fişinden Luca yevmiye kaydı hazırlar.</p>
          <nav className="foot-links" aria-label="Alt bağlantılar">
            <Link href="/giris" prefetch={false}>Giriş yap</Link>
            <Link href="/kayit" prefetch={false}>Hesap oluştur</Link>
            <a href="#sss">Sık sorulanlar</a>
            <Link href="/gizlilik" prefetch={false}>Gizlilik</Link>
          </nav>
        </div>
        <p className="foot-credit">Görsel kaynakları: termal fiş şeridi, Towfiqu barbhuiya, <a href="https://unsplash.com/photos/payment-terminal-with-white-receipt-xkArbdUcUeE">Unsplash</a> (Unsplash Lisansı); termal kâğıt rulosu, Acheolg, <a href="https://commons.wikimedia.org/w/index.php?curid=156143903">Wikimedia Commons</a> (CC BY-SA 4.0, kırpıldı).</p>
        <p className="foot-name" translate="no" aria-hidden="true">Accountie</p>
      </footer>
      {/* Fixed strip, last in reading and Tab order. */}
      <CookieNote />
    </>
  );
}
