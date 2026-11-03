import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { CookieNote } from "@/components/site/CookieNote";
import { SiteBar } from "@/components/site/SiteBar";
import { Counter } from "@/components/home/Counter";
import { Faq, type Qa } from "@/components/home/Faq";
import { HomeMotion } from "@/components/home/HomeMotion";
import { LoopVideo } from "@/components/home/LoopVideo";
import { ShowRow, type Piece } from "@/components/home/ShowRow";
import { SignupDialog } from "@/components/home/SignupDialog";
import { SAMPLES } from "@/components/home/samples";
import { Thermal } from "@/components/home/Thermal";
import { WARNING_MESSAGES } from "@/lib/journal";
import { PAYMENT_ALTERNATIVES } from "@/lib/default-rules";
import bazaar from "../../public/gorseller/kapalicarsi-1890.jpg";
import defterdar from "../../public/gorseller/defterdar-dairesi.jpg";
import bankVault from "../../public/gorseller/osmanli-bankasi-kasa-dairesi.jpg";
import concession from "../../public/gorseller/osmanli-bankasi-imtiyaz-1863.jpg";
import drawer from "../../public/gorseller/para-cekmecesi.jpg";
import "@/components/home/home.css";

// Public and static: no session, no user data (docs/design/YON.md 5.5).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "Accountie: yazar kasa fişinden Luca yevmiye kaydı" },
  description: "Yazar kasa fişini telefonla çekin, Luca Fiş Detayı satırları hesap planınıza göre hazırlansın. Kontrol edip onaylayın, Excel ile Luca'ya aktarın.",
};

// Marks <html> before the hero paints, so the masked headline starts hidden only when script runs.
const cssVars = (v: Record<string, string | number>) => v as CSSProperties;
const JS_FLAG = "document.documentElement.classList.add('js')";

const LINES_0047 = [
  { code: "770.08", name: "Yeme-İçme ve Ağırlama Giderleri", debit: "7.931,82", credit: "" },
  { code: "191.03.10", name: "%10 İndirilecek KDV", debit: "793,18", credit: "" },
  { code: "331.01", name: "Ortaklara Borçlar", debit: "", credit: "8.725,00" },
];

function MiniLines() {
  return (
    <table className="ui-table">
      <thead><tr><th scope="col">Hesap</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
      <tbody>
        {LINES_0047.map((l) => (
          <tr key={l.code}>
            <td><span className="code" translate="no">{l.code}</span><span className="code-name">{l.name}</span></td>
            <td className="num to-luca">{l.debit}</td>
            <td className="num to-luca">{l.credit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


const PIECES: Piece[] = [
  {
    name: "Kontrol ekranı",
    text: "Fişten okunan alanlar ve Luca satırları aynı ekranda. Hesap kodu, tutar, evrak no ve BT orada düzeltilir.",
    body: (
      <div className="ui-card ui-review">
        <dl className="ui-read">
          <div><dt>Satıcı</dt><dd translate="no">ÖRNEK BALIK…</dd></div>
          <div><dt>Evrak No</dt><dd>0047</dd></div>
          <div><dt>Tarih</dt><dd>05.09.2026</dd></div>
          <div><dt>KDV %10</dt><dd>793,18</dd></div>
          <div><dt>Toplam</dt><dd>8.725,00</dd></div>
        </dl>
        <div className="ui-review-lines">
          <MiniLines />
          <p className="ui-meta">Evrak No 0047, 05.09.2026, BT ÖK</p>
        </div>
      </div>
    ),
  },
  {
    name: "Alacak hesabı",
    text: "Ortağın kartıyla ödendiyse 331.01, şirket kartıysa 309.01. Tek seçimle değişir.",
    body: (
      <div className="ui-card ui-menu-wrap">
        <p className="ui-label">Alacak hesabı</p>
        <p className="ui-select">331.01 Ortaklara Borçlar</p>
        <ul className="ui-menu">
          {PAYMENT_ALTERNATIVES.map((a) => (
            <li key={a.code} data-selected={a.code === "331.01" || undefined}>
              <span className="code" translate="no">{a.code}</span> {a.label}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    name: "Dengesiz fiş",
    text: "Borç ile alacak tutmazsa Onayla kapanır ve fark kuruşuyla görünür.",
    body: (
      <div className="ui-card">
        <dl className="ui-totals">
          <div><dt>Borç</dt><dd>8.725,00</dd></div>
          <div><dt>Alacak</dt><dd>8.752,00</dd></div>
          <div><dt>Fark</dt><dd className="balance-off">27,00</dd></div>
        </dl>
        <div className="ui-approve">
          <span className="btn btn-primary" aria-disabled="true">Onayla</span>
          <span className="ui-reason">Borç ile alacak eşit olmadan onaylanamaz.</span>
        </div>
      </div>
    ),
  },
  {
    name: "Uyarı notları",
    text: "Binek araç, ağırlama ve eski KDV oranı satırın yanında not olarak durur, onayı engellemez.",
    body: (
      <div className="ui-card ui-notes">
        <p><span className="pill pill-warn">Binek araç</span> {WARNING_MESSAGES.vehicle}</p>
        <p><span className="pill pill-warn">Ağırlama</span> {WARNING_MESSAGES.meal}</p>
        <p><span className="pill pill-warn">Eski oran</span> {WARNING_MESSAGES.legacy_rate}</p>
      </div>
    ),
  },
  {
    name: "Luca dosyası",
    text: "Accountie onaylı fişleri dosya başına en fazla 50 fiş ve 400 satır olarak yazar. Fazlası ek dosyaya geçer, bir fiş iki dosyaya bölünmez.",
    body: (
      <div className="ui-card ui-file">
        <p className="ui-file-head"><span>Eylül 2026</span><span className="ui-meta">38 onaylı fiş, 296 satır</span></p>
        <div className="ui-meter"><span>Fiş</span><span className="ui-track"><span style={{ width: "76%" }} /></span><span className="num">38 / 50</span></div>
        <div className="ui-meter"><span>Satır</span><span className="ui-track"><span style={{ width: "74%" }} /></span><span className="num">296 / 400</span></div>
        <ul className="ui-files">
          <li><span className="ui-file-name">luca-fisler-2026-09-1.xlsx</span><span className="ui-meta">50 fiş, 388 satır</span></li>
          <li><span className="ui-file-name">luca-fisler-2026-09-2.xlsx</span><span className="ui-meta">38 fiş, 296 satır</span></li>
        </ul>
        <span className="btn">Luca için indir</span>
      </div>
    ),
  },
  {
    name: "Eklenti uyarısı",
    text: "Açık Fiş Detayı ekranına satırları yazmayı dener. Luca’da henüz denenmedi; birincil yol Excel aktarımıdır.",
    body: (
      <div className="ui-card ui-ext">
        <p className="ui-ext-head"><BrandMark /> Accountie</p>
        <p className="ui-warn">Alan bulunamadı: 1. satır BT. Bu alanları elle doldurun, sonra Kaydet’e siz basın.</p>
        <p className="ui-meta">Eklenti bulamadığı alanı tahmin etmez.</p>
      </div>
    ),
  },
];

const NOTES = [
  { name: "Kategoriden gider hesabı", text: "Yemek ve ağırlama 770.08’e, akaryakıt 770.01’e yazılır. Kodları kendi planınıza göre değiştirin." },
  { name: "Orandan KDV hesabı", text: "%1, %10 ve %20 için ayrı 191 hesabı. Çok oranlı fişte her oran kendi satırını açar." },
  { name: "Ödemeden alacak hesabı", text: "Nakit Kasa’ya, kart Ortaklara Borçlar’a. Fiş bazında tek seçimle değişir." },
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
    case 3: return <>{row("Nakit", "100.01", "Kasa")}{row("Kart", "331.01", "Ortaklara Borçlar")}</>;
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
  { group: "Excel veri aktarımı", rows: [["Onaylı fişler tek dosyada", ".xlsx"], ["Accountie dosya başına yazar", "en fazla 50 fiş, 400 satır"], ["Evrak No metin hücresi", "0047 korunur"], ["İndirilen fişler", "Aktarıldı olur"]] },
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
  { q: "Kişisel verilerim nasıl işleniyor?", a: "Hangi verinin hangi hizmete gittiği ve ne kadar tutulduğu gizlilik ve aydınlatma metninde yazılı. Bağlantısı sayfanın altında." },
  { q: "Telefonda uygulama gibi açılır mı?", a: "Evet. Ana ekrana eklediğinizde ayrı bir uygulama gibi açılır, Fiş çek tek dokunuştur." },
];

const PD = "https://creativecommons.org/publicdomain/mark/1.0/";
const FLICKR_COMMONS = "https://www.flickr.com/commons/usage/";
const CREDITS = [
  { title: "Intérieur du Gran Bazar", by: "Sébah & Joaillier", license: "kamu malı", licenseUrl: PD, page: "https://commons.wikimedia.org/wiki/File:Int%C3%A9rieur_du_Gran_Bazar,_by_S%C3%A9bah_%26_Joaillier,_c._1889-1900,_from_the_Digital_Commonwealth_-_commonwealth_3x8195553.jpg" },
  { title: "Keystrokes in a vintage mechanical calculator", by: "Subhashish Panigrahi", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/wiki/File:Keystrokes_in_a_vintage_mechanical_calculator.webm" },
  { title: "Ottoman Bank, Safe Rooms", by: "SALT Araştırma", license: "bilinen telif kısıtlaması yok", licenseUrl: FLICKR_COMMONS, page: "https://commons.wikimedia.org/wiki/File:Ottoman_Bank,_Safe_Rooms_(12965331153).jpg" },
  { title: "Act of concession of the Imperial Ottoman Bank, February 4, 1863", by: "SALT Araştırma", license: "bilinen telif kısıtlaması yok", licenseUrl: FLICKR_COMMONS, page: "https://commons.wikimedia.org/wiki/File:Act_of_concession_of_the_Imperial_Ottoman_Bank,_February_4,_1863._(22175414171).jpg" },
  { title: "Para Çekmecesi (Cash Drawer)", by: "Paracekmecesi", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/w/index.php?curid=87593460" },
  { title: "Louis-Nicolas de Lespinasse, Deferdar’s office", by: "Gmihail, Sırpça Vikipedi", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", page: "https://commons.wikimedia.org/wiki/File:Louis-Nicolas_de_Lespinasse,_Deferdar%27s_office.jpg" },
];

// Second gallery row: three pictures, one ratio (4:3), one caption line. The public-domain ones are dimmed on the dark page.
const GALLERY = [
  { src: bankVault, pd: true, at: "30% 50%", alt: "Osmanlı Bankası’nın kasa dairesi: ahşap kasa kapakları ve raflarda ciltli hesap defterleri", caption: "Osmanlı Bankası’nın kasa dairesinde ciltli defterler, bugün SALT Galata." },
  { src: concession, pd: true, at: "40% 50%", alt: "Osmanlı Bankası’nın 1863 tarihli imtiyaz belgesi, Osmanlıca ve Fransızca iki sütun halinde açık duruyor", caption: "Osmanlı Bankası imtiyaz belgesi, 1863. Osmanlıca ve Fransızca." },
  { src: drawer, pd: false, at: "60% 50%", alt: "Bir tezgâhta para çekmecesi açık, üstünde kart ödeme cihazı duruyor", caption: "Bir tezgâhta para çekmecesi ve kartlı ödeme cihazı." },
];

const PATH = [
  { clause: "Önce telefonla çekilir.", card: (
    <>
      <p className="ui-card-head"><span>Fiş</span><span className="status" data-step>Okunuyor…</span></p>
      <div className="path-strip"><Thermal sample={SAMPLES[0]} printedPayment="KREDİ KARTI" compact /></div>
      <p className="ui-meta" data-step>Fotoğraf cihazınızda kalır.</p>
    </>
  ) },
  { clause: "Sonra fiş okunur.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0047</span><span className="status" data-step>Taslak</span></p>
      {[["Satıcı", "ÖRNEK BALIK…"], ["Evrak No", "0047"], ["Tarih", "05.09.2026"], ["KDV %10", "793,18"], ["Toplam", "8.725,00"], ["Kategori", "Yemek ve ağırlama"]].map(([k, v]) => (
        <p className="ui-kv" key={k}><span>{k}</span><span className="from-receipt" data-step>{v}</span></p>
      ))}
    </>
  ) },
  { clause: "Ardından siz onaylarsınız.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0047</span><span className="status status-approved" data-step>Onaylandı</span></p>
      {LINES_0047.map((l) => (
        <p className="ui-kv" key={l.code} data-step><span className="code" translate="no">{l.code}</span><span className="to-luca">{l.debit || l.credit}</span></p>
      ))}
      <p className="ui-meta balance-ok" data-step>Borç 8.725,00 = Alacak 8.725,00</p>
    </>
  ) },
  { clause: "En son Luca’ya gider.", card: (
    <>
      <p className="ui-card-head"><span>Fiş 0047</span><span className="status status-exported" data-step>Aktarıldı</span></p>
      <p className="ui-file-name" data-step>luca-fisler-2026-09-05.xlsx</p>
      <table className="ui-sheet" data-step>
        <thead><tr><th scope="col">Hesap</th><th scope="col">Evrak</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
        <tbody>
          {LINES_0047.map((l) => (
            <tr key={l.code}><td translate="no">{l.code}</td><td>0047</td><td className="num to-luca">{l.debit}</td><td className="num to-luca">{l.credit}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="ui-meta" data-step>1 fiş, 3 satır, BT ÖK</p>
    </>
  ) },
];

export default function LandingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
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
              Yazar kasa fişini telefonla çekin; matrah, KDV ve alacak hesabı sizin hesap planınıza göre Luca Fiş Detayı satırlarına yazılır.
            </p>
            <p data-load style={cssVars({ "--d": "480ms" })}>
              <Link className="btn btn-accent btn-lg" href="/kayit">Hesap oluştur</Link>
            </p>
          </div>
          <div className="hero-stage">
            <div className="hero-counter" data-load style={cssVars({ "--d": "200ms" })}><Counter /></div>
          </div>
        </section>

        {/* how-it-works: one card, four fields */}
        <section className="path" aria-labelledby="path-title">
          {PATH.map((f, i) => (
            <div className={`path-field path-field-${i + 1}`} key={f.clause} data-reveal style={cssVars({ "--r": i })}>
              {i === 0 ? <h2 className="t-head path-title" id="path-title">Bir fişin yolu</h2> : <span className="path-title" aria-hidden="true" />}
              <div className="ui-card path-card" data-ui>{f.card}</div>
              <p className="path-clause">{f.clause}</p>
            </div>
          ))}
        </section>

        {/* gallery: the rule the ledger always had, in real pictures */}
        <section className="rule wrap" aria-labelledby="rule-title">
          <div className="rule-copy">
            <h2 className="t-head" id="rule-title" data-reveal>Defterin kuralı aynı</h2>
            <p className="rule-sub" data-reveal style={cssVars({ "--r": 1 })}>
              Çarşı esnafının defterinde de, Luca’da da borç ile alacak eşit olmadan kayıt kapanmaz. Accountie tutmayan fişi onaya göndermez.
            </p>
          </div>
          <figure className="rule-figure rule-figure-bazaar" data-reveal="shutter" style={cssVars({ "--r": 1 })}>
            <div className="frame frame-43"><Image className="pd-photo" src={bazaar} placeholder="blur" loading="eager" alt="1890’larda Kapalıçarşı’nın içi: kemerli tavanın altında dükkânlar, kumaş tezgâhları ve fesli esnaf" sizes="(max-width: 900px) 100vw, 50vw" /></div>
            <figcaption>Kapalıçarşı’da dükkânlar, İstanbul, 1890’lar.</figcaption>
          </figure>
          <figure className="rule-figure rule-figure-clip" data-reveal="shutter" style={cssVars({ "--r": 2 })}>
            <div className="frame frame-43"><LoopVideo src={{ mp4: "/gorseller/hesap-makinesi.mp4", webm: "/gorseller/hesap-makinesi.webm" }} poster="/gorseller/hesap-makinesi-poster.jpg" width={854} height={480} /></div>
            <figcaption>Eski bir toplama makinesinde tuşlama.</figcaption>
          </figure>
          {GALLERY.map((g, i) => (
            <figure className="rule-figure rule-figure-third" key={g.caption} data-reveal="shutter" style={cssVars({ "--r": i })}>
              <div className="frame frame-43"><Image className={g.pd ? "pd-photo" : undefined} src={g.src} placeholder="blur" alt={g.alt} sizes="(max-width: 900px) 100vw, 33vw" style={{ objectPosition: g.at }} /></div>
              <figcaption>{g.caption}</figcaption>
            </figure>
          ))}
        </section>

        {/* showcase: lit panel, dark row */}
        <section className="show" aria-labelledby="show-title">
          <div className="show-inner wrap">
            <h2 className="t-head show-title" id="show-title" data-reveal>Kontrol ekranından Luca’ya</h2>
            <ShowRow pieces={PIECES} />
          </div>
        </section>

        {/* features: panel with margin notes; the panel is a picture of the rules screen, nothing in it is editable */}
        <section className="feat wrap" aria-labelledby="feat-title">
          <h2 className="t-head feat-title" id="feat-title" data-reveal>Sizin hesap planınız</h2>
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
            <div className={`feat-note ${i % 2 ? "feat-note-r" : "feat-note-l"}`} data-note={i + 1} key={n.name} style={{ gridRow: i + 3, ...cssVars({ "--r": i + 1 }) }} data-reveal>
              <h3 className="feat-note-name">{n.name}</h3>
              <p className="feat-note-text">{n.text}</p>
            </div>
          ))}
        </section>

        {/* list: two-ended rows, and a real ledger page beside them */}
        <section className="routes wrap" aria-labelledby="routes-title">
          <div className="routes-list">
            <h2 className="t-head" id="routes-title" data-reveal>Luca’ya üç yol</h2>
            {ROUTES.map((g, gi) => (
              <div className="routes-group" key={g.group}>
                <h3 className="routes-group-name" data-reveal style={cssVars({ "--r": gi + 1 })}>{g.group}</h3>
                <ul>
                  {g.rows.map(([name, value], ri) => (
                    <li key={name} data-reveal style={cssVars({ "--r": gi + ri + 2 })}><span className="dot" aria-hidden="true" /><span className="routes-name">{name}</span><span className="routes-value">{value}</span></li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="routes-tip" data-reveal style={cssVars({ "--r": 5 })}>İlk aktarımı tek fişle deneyin: Luca’nın önizlemesinde satırları kontrol edip Fiş Kes’e basın.</p>
          </div>
          <figure className="routes-figure" data-reveal="shutter" style={cssVars({ "--r": 1 })}>
            <div className="frame frame-45"><Image src={defterdar} placeholder="blur" alt="Gravür: Osmanlı defterdarlık dairesinde minderlere oturmuş kâtipler, önlerindeki rahlelerde defter tutuyor" sizes="(max-width: 900px) 100vw, 40vw" /></div>
            <figcaption>Defterdarlık dairesinde kâtipler, İstanbul. Louis-Nicolas de Lespinasse gravürü, 18. yüzyıl.</figcaption>
          </figure>
        </section>

        {/* faq: question index, one answer */}
        <section className="faq wrap" aria-labelledby="sss-title" id="sss">
          <Faq items={FAQ} titleId="sss-title" />
        </section>

        {/* cta: first step, already open */}
        <section className="cta" aria-labelledby="cta-title">
          <div className="cta-inner wrap">
            <div className="cta-copy" data-reveal>
              <h2 className="t-display cta-title" id="cta-title"><span>İlk fişinizi</span> <span>çekin</span></h2>
              <p className="cta-sub">Hesabı açtığınızda varsayılan hesap planı kural tablonuza kopyalanır. İlk fişi telefonla çekip kontrol ekranında görürsünüz.</p>
            </div>
            <div className="cta-window" data-reveal style={cssVars({ "--r": 2 })}><SignupDialog /></div>
          </div>
        </section>
      </main>

      <footer className="foot wrap">
        <div className="foot-top">
          <p className="foot-what"><span translate="no">Accountie</span>, yazar kasa fişinden Luca yevmiye kaydı hazırlar.</p>
          <nav className="foot-links" aria-label="Alt bağlantılar">
            <Link href="/giris">Giriş yap</Link>
            <Link href="/kayit">Hesap oluştur</Link>
            <a href="#sss">Sık sorulanlar</a>
            <Link href="/gizlilik">Gizlilik ve aydınlatma</Link>
          </nav>
          <div className="foot-credits">
            <p className="foot-credits-title">Görsel kaynakları</p>
            <ul>
              {CREDITS.map((c) => (
                <li key={c.page}>
                  <a href={c.page} rel="noopener noreferrer">&ldquo;{c.title}&rdquo;</a>{c.by ? `, ${c.by}` : ""}, <a href={c.licenseUrl} rel="noopener noreferrer">{c.license}</a>, Wikimedia Commons
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="foot-name" translate="no" aria-hidden="true">Accountie</p>
      </footer>
      <CookieNote />
    </>
  );
}
