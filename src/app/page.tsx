import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { CookieNote } from "@/components/site/CookieNote";
import { SiteBar } from "@/components/site/SiteBar";
import { Counter } from "@/components/home/Counter";
import { Faq, type Qa } from "@/components/home/Faq";
import { AppWindow, Phone } from "@/components/home/Frames";
import { HomeMotion } from "@/components/home/HomeMotion";
import { ShowRow, type Piece } from "@/components/home/ShowRow";
import { journalFor, SAMPLES, shownAccountName, sourcesFor } from "@/components/home/samples";
import { Spotlight } from "@/components/home/Spotlight";
import { Thermal } from "@/components/home/Thermal";
import { WARNING_MESSAGES } from "@/lib/journal";
import { formatTrAmount } from "@/lib/money";
import { PAYMENT_ALTERNATIVES } from "@/lib/default-rules";
import "@/components/home/home.css";

// Public and static: no session, no user data (docs/design/YON.md 5.5).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "Accountie: yazar kasa fişinden Luca yevmiye kaydı" },
  description: "Yazar kasa fişini telefonla çekin, Luca Fiş Detayı satırları hesap planınıza göre hazırlansın. Kontrol edip onaylayın, Excel ile Luca'ya aktarın.",
};

const cssVars = (v: Record<string, string | number>) => v as CSSProperties;

const LINES_0047 = [
  { code: "770.08", name: "Yeme-İçme ve Ağırlama Giderleri", debit: "7.931,82", credit: "" },
  { code: "191.03.10", name: "%10 İndirilecek KDV", debit: "793,18", credit: "" },
  { code: "331.01", name: "Ortaklara Borçlar", debit: "", credit: "8.725,00" },
];

/** The three Luca lines of fiş 0047; `credit` replaces the credit amount (the misread receipt), `mark` adds a note to one line. */
function MiniLines({ credit, mark, lit }: { credit?: string; mark?: { code: string; node: ReactNode }; lit?: string }) {
  return (
    <table className="ui-table">
      <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
      <tbody>
        {LINES_0047.map((l) => (
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


/** Where each of fiş 0047's three amounts is printed on the strip (Thermal data-amt): base, TOPKDV, TOPLAM. */
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
    name: "Fiş ve satırlar",
    text: "Fişten okunan alanlar ve Luca satırları aynı ekranda. Hesap kodu, tutar, Evrak No ve BT orada düzeltilir.",
    body: (
      <Spotlight meta="Evrak No 2214, 04.09.2026, BT ÖK. Her KDV oranı kendi satırını açar." read={MARKET_READ} lines={MARKET_LINES} />
    ),
  },
  {
    name: "Alacak hesabı",
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
        <MiniLines lit="331.01" />
      </div>
    ),
  },
  {
    name: "Uyarı notları",
    text: "Binek araç, ağırlama ve eski KDV oranı satırın yanında not olarak durur, onayı engellemez.",
    body: (
      <div className="ui-card ui-split">
        <MiniLines mark={{ code: "770.08", node: <span className="pill pill-warn">Ağırlama</span> }} />
        <div className="ui-notes">
          <p><span className="pill pill-warn">Ağırlama</span> {WARNING_MESSAGES.meal}</p>
          <p><span className="pill pill-warn">Binek araç</span> {WARNING_MESSAGES.vehicle}</p>
          <p><span className="pill pill-warn">Eski oran</span> {WARNING_MESSAGES.legacy_rate}</p>
        </div>
      </div>
    ),
  },
  {
    name: "Luca dosyası",
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
    name: "Eklenti uyarısı",
    text: "Açık Fiş Detayı ekranına satırları yazmayı dener. Luca’da henüz denenmedi; birincil yol Excel aktarımıdır.",
    body: (
      <div className="ui-card ui-split">
        <div className="ui-ext">
          <p className="ui-ext-head"><BrandMark /> Accountie</p>
          <ul className="ui-files">
            {LINES_0047.map((l, i) => (
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

const PATH = [
  { clause: "Önce telefonla çekilir.", card: (
    <>
      <p className="ui-card-head"><span>Fiş</span><span className="status" data-step>Çekildi</span></p>
      <div className="path-strip"><Thermal sample={SAMPLES[0]} printedPayment="KREDİ KARTI" compact /></div>
      <p className="ui-meta" data-step>Accountie fotoğrafı saklamaz.</p>
    </>
  ) },
  { clause: "Sonra fiş okunur.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0047</span><span className="status" data-step>Taslak</span></p>
      {[["Satıcı", "ÖRNEK BALIK LOKANTASI"], ["Evrak No", "0047"], ["Tarih", "05.09.2026"], ["KDV %10", "793,18"], ["Toplam", "8.725,00"], ["Ödeme", "KREDİ KARTI"], ["Kategori", "Yemek ve ağırlama"]].map(([k, v]) => (
        <p className="ui-kv" key={k}><span>{k}</span><span className="from-receipt" data-step>{v}</span></p>
      ))}
    </>
  ) },
  { clause: "Ardından siz onaylarsınız.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0047</span><span className="status status-approved" data-step>Onaylandı</span></p>
      {LINES_0047.map((l) => (
        <p className="ui-kv ui-kv-line" key={l.code} data-step><span><span className="code" translate="no">{l.code}</span><span className="code-name">{l.name}</span></span><span className="to-luca">{l.debit || l.credit}</span></p>
      ))}
      <p className="ui-meta" data-step>Evrak No 0047, 05.09.2026, BT ÖK</p>
      <p className="ui-meta balance-ok" data-step>Borç 8.725,00 = Alacak 8.725,00</p>
    </>
  ) },
  { clause: "En son Excel ile Luca’ya yüklenir.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0047</span><span className="status status-exported" data-step>Aktarıldı</span></p>
      <p className="path-file" data-step><span className="ui-file-name">luca-fisler-20260905.xlsx</span><span>1 fiş, 3 satır</span></p>
      <table className="ui-sheet" data-step>
        <thead><tr><th scope="col">Hesap</th><th scope="col">Evrak</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
        <tbody>
          {LINES_0047.map((l) => (
            <tr key={l.code}><td translate="no">{l.code}</td><td>0047</td><td className="num to-luca">{l.debit}</td><td className="num to-luca">{l.credit}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="ui-meta" data-step>Luca’da Excel veri aktarımı ile yüklenir, Fiş Kes ile kaydedilir.</p>
    </>
  ) },
];

export default function LandingPage() {
  return (
    <>
      <HomeMotion />
      <SiteBar />
      <main id="icerik" tabIndex={-1} className="home">
        {/* Hero: two tones, the counter is the picture */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 className="hero-title lines" id="hero-title">
              <span className="line"><span data-line style={cssVars({ "--i": 0 })}>Fişten Luca’ya</span></span>{" "}
              <span className="line"><span data-line style={cssVars({ "--i": 1 })}>yevmiye kaydı</span></span>
            </h1>
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

        {/* how-it-works: on desktop a sticky split story (four clauses, one card through four states, the field wiped in from
            below, YON.md 23.3.4); without script, below 1100px and with reduced motion the four cards stand in their own fields. */}
        <section className="path" aria-labelledby="path-title" data-active="1">
          <h2 className="t-head path-title" id="path-title">Bir fişin yolu</h2>
          {PATH.map((f, i) => (
            <div className={`path-field path-field-${i + 1}`} key={f.clause} data-n={i + 1}>
              <p className="path-clause"><span>{f.clause}</span></p>
              <div className="path-plate"><div className="ui-card path-card" data-ui>{f.card}</div></div>
            </div>
          ))}
          <div className="path-stage" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => <span key={n} className={`path-bg path-bg-${n}`} />)}
            {/* One card through four states: the shell and its head stay, the pill rolls, only the body under it changes. */}
            <div className="ui-card path-shell" data-ui>
              <p className="ui-card-head"><span>Fiş 0047</span>
                <span className="path-pill">
                  <span className="status" data-s="1">Çekildi</span><span className="status" data-s="2">Taslak</span>
                  <span className="status status-approved" data-s="3">Onaylandı</span><span className="status status-exported" data-s="4">Aktarıldı</span>
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* The signature (YON.md 23.3.1): in the control window the receipt's base, VAT and total lift off the paper and land in
            their Luca cells, codes come in, the balance closes and Onayla opens. Server output is the end state. */}
        <section className="rule" aria-labelledby="rule-title" data-scene="rule">
          <div className="rule-track">
            <div className="rule-stick wrap">
              <h2 className="t-head rule-title" id="rule-title">Borç alacağa eşit olmadan onay yok</h2>
              <div className="rule-copy">
                <p className="rule-sub">Fişten okunan matrah, KDV ve toplam kendi hesap satırına iner. Borç alacağa eşit olunca Onayla açılır.</p>
                <ul className="rule-map">
                  <li><span>Matrah</span><span translate="no">770.08 borç</span></li>
                  <li><span>TOPKDV</span><span translate="no">191.03.10 borç</span></li>
                  <li><span>TOPLAM</span><span translate="no">331.01 alacak</span></li>
                </ul>
              </div>
              <AppWindow title="Fiş 0047, kontrol" className="rule-win">
                <div className="rule-body">
                  <div className="rule-receipt"><Thermal sample={SAMPLES[0]} printedPayment="KREDİ KARTI" base /></div>
                  <div className="rule-ledger">
                    <table className="ui-table rule-table">
                      <caption className="visually-hidden">Fiş 0047 için Luca satırları</caption>
                      <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
                      <tbody>
                        {LINES_0047.map((l, i) => (
                          <tr key={l.code} style={cssVars({ "--n": i })}>
                            <td><span className="code rule-code" translate="no">{l.code}</span><span className="code-name">{l.name}</span></td>
                            <td className="num to-luca">{l.debit ? <FlyCell value={l.debit} from={FLY_FROM[i]} /> : <Dash />}</td>
                            <td className="num to-luca">{l.credit ? <FlyCell value={l.credit} from={FLY_FROM[i]} /> : <Dash />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="rule-close">
                      <dl className="ui-totals">
                        <div><dt>Borç</dt><dd>8.725,00</dd></div>
                        <div><dt>Alacak</dt><dd>8.725,00</dd></div>
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
          <div className="rule-after wrap">
            <p className="rule-note">Fişte toplam 8.725,00 iken alacak 8.752,00 okunursa fark 27,00 olarak görünür ve Onayla kapalı kalır. Tutarı fişe göre düzeltince onay açılır.</p>
            <div className="rule-proof" data-ui>
              <div className="ui-card rule-card">
                <p className="ui-card-head"><span translate="no">ÖRNEK BALIK LOKANTASI</span><span className="status">Taslak</span></p>
                <MiniLines credit="8.752,00" />
                <dl className="ui-totals">
                  <div><dt>Borç</dt><dd>8.725,00</dd></div>
                  <div><dt>Alacak</dt><dd>8.752,00</dd></div>
                  <div><dt>Fark</dt><dd className="balance-off">27,00</dd></div>
                </dl>
                <div className="ui-approve">
                  <span className="btn btn-primary" aria-disabled="true">Onayla</span>
                  <span className="ui-reason">Fişte toplam 8.725,00. Alacak satırını düzeltin.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* showcase: lit panel, dark row */}
        <section className="show" aria-labelledby="show-title">
          <div className="show-inner wrap">
            <h2 className="t-head show-title" id="show-title">Kontrol ekranından Luca’ya</h2>
            <ShowRow pieces={PIECES} />
          </div>
        </section>

        {/* features: panel with margin notes, each note on the row of the part it explains; nothing in the panel is editable */}
        <section className="feat wrap" aria-labelledby="feat-title">
          <h2 className="t-head feat-title" id="feat-title">Sizin hesap planınız</h2>
          <div className="feat-plate" aria-hidden="true" />
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

        {/* list: two-ended rows, and the Fişler window the file comes out of */}
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
            {/* The file Luca reads: the export's own columns (src/lib/luca/export.ts) for fiş 0047, leaving the window. */}
            <div className="ui-card routes-file" data-ui>
              <p className="ui-card-head"><span className="ui-file-name">luca-fisler-20260905.xlsx</span><span className="ui-meta">Fişler sayfası</span></p>
              {/* On a phone the identifier columns step aside so the amounts stay whole; a narrower screen still scrolls, so the region is a keyboard stop (WCAG 2.1.1). */}
              <div className="routes-file-scroll" tabIndex={0} role="region" aria-label="Luca Excel dosyasının ilk satırları">
                <table className="ui-sheet">
                  <thead><tr>{["Fiş No", "Fiş Tarihi", "Hesap Kodu", "Evrak No", "Borç", "Alacak", "Belge Türü"].map((c) => <th scope="col" key={c} className={c === "Borç" || c === "Alacak" ? "num" : c === "Hesap Kodu" || c === "Belge Türü" ? undefined : "sheet-id"}>{c}</th>)}</tr></thead>
                  <tbody>
                    {LINES_0047.map((l) => (
                      <tr key={l.code}><td className="sheet-id">1</td><td className="sheet-id">05.09.2026</td><td translate="no">{l.code}</td><td className="sheet-id">0047</td><td className="num to-luca">{l.debit}</td><td className="num to-luca">{l.credit}</td><td>ÖK</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* faq: question index, one answer */}
        <section className="faq wrap" aria-labelledby="sss-title" id="sss">
          <Faq items={FAQ} titleId="sss-title" />
        </section>

        {/* cta: one action, beside the machine the receipt comes from */}
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
              <Phone className="cta-phone">
                <p className="phone-head"><span>Fiş çek</span><span>Fişi çerçeveye sığdırın</span></p>
                <div className="cam">
                  <span className="cam-c cam-c1" /><span className="cam-c cam-c2" /><span className="cam-c cam-c3" /><span className="cam-c cam-c4" />
                  <Thermal sample={SAMPLES[1]} printedPayment="NAKİT" compact />
                </div>
                <span className="btn btn-primary cam-shoot">Fiş çek</span>
                <p className="cam-last"><span><span className="cam-last-no">Önceki fiş 0047</span><span className="code-name">8.725,00</span></span><span className="status">Taslak</span></p>
              </Phone>
              <figcaption>Telefonda Fiş çek tek dokunuştur; çekilen fiş listeye taslak olarak düşer.</figcaption>
            </figure>
          </div>
        </section>
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
        <p className="foot-name" translate="no" aria-hidden="true">Accountie</p>
      </footer>
      <CookieNote />
    </>
  );
}
