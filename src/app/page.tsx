import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ThemeCycle, ThemeSwitch } from "@/components/ThemeSwitch";
import { Counter } from "@/components/home/Counter";
import { Faq, type Qa } from "@/components/home/Faq";
import { HomeMotion } from "@/components/home/HomeMotion";
import { LoopVideo } from "@/components/home/LoopVideo";
import { SignupDialog } from "@/components/home/SignupDialog";
import { WARNING_MESSAGES } from "@/lib/journal";
import { PAYMENT_ALTERNATIVES } from "@/lib/default-rules";
import ledger1833 from "../../public/gorseller/yevmiye-defteri-1833.jpg";
import ledger1870 from "../../public/gorseller/hesap-defteri-1870.jpg";
import register from "../../public/gorseller/yazar-kasa.jpg";
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
const VENDOR = "ÖRNEK BALIK LOKANTASI";

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

type Piece = { name: string; text: string; span: number; body: ReactNode };

const PIECES: Piece[] = [
  {
    name: "Kontrol ekranı", span: 7,
    text: "Fotoğraf ve satırlar aynı ekranda. Hesap kodu, tutar, evrak no ve BT orada düzeltilir.",
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
    name: "Alacak hesabı", span: 5,
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
    name: "Dengesiz fiş", span: 5,
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
    name: "Uyarı notları", span: 7,
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
    name: "Luca dosyası", span: 6,
    text: "Luca bir yüklemede 50 fiş ve 400 satır kabul eder. Fazlası ek dosyaya geçer, fiş ortadan bölünmez.",
    body: (
      <div className="ui-card ui-file">
        <p className="ui-file-head">3 onaylı fiş, 9 satır</p>
        <div className="ui-meter"><span>Fiş</span><span className="ui-track"><span style={{ width: "6%" }} /></span><span className="num">3 / 50</span></div>
        <div className="ui-meter"><span>Satır</span><span className="ui-track"><span style={{ width: "2.25%" }} /></span><span className="num">9 / 400</span></div>
        <span className="btn">Luca için indir</span>
      </div>
    ),
  },
  {
    name: "Chrome eklentisi (deneysel)", span: 6,
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
  { name: "Kod biçimi", text: "770.08 gibi üç hane ve noktalı alt hesaplar kabul edilir. Hatalı kod kaydedilmez." },
  { name: "Yalnız yeni fişler", text: "Kural değişikliği kayıtlı satırları değiştirmez, sonraki fişlere uygulanır." },
];

function RulePart({ n }: { n: number }) {
  const row = (label: string, code: string, name: string) => (
    <div className="ui-rule" key={label}>
      <span className="ui-rule-label">{label}</span>
      <input className="field ui-code" aria-label={`${label} hesap kodu`} defaultValue={code} spellCheck={false} autoComplete="off" />
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
        <input className="field ui-code" aria-label="Bakım ve onarım hesap kodu" defaultValue="770,07" aria-invalid="true" aria-describedby="kod-hata" spellCheck={false} autoComplete="off" />
        <span className="field-error" id="kod-hata">Kod 770.07 biçiminde olmalı.</span>
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
  { group: "Excel veri aktarımı", rows: [["Onaylı fişler tek dosyada", ".xlsx"], ["Bir dosyada en fazla", "50 fiş, 400 satır"], ["Evrak No metin hücresi", "0047 korunur"], ["İndirilen fişler", "Aktarıldı olur"]] },
  { group: "Pano", rows: [["Tek fişin satırları", "Fiş Detayı sırasında"], ["Kolonlar", "Hesap, Evrak No, Tarih, BT, Açıklama, Borç, Alacak"]] },
  { group: "Chrome eklentisi (deneysel)", rows: [["Açık Fiş Detayı ekranını doldurur", "Kaydet sizde"], ["Luca ekranıyla", "Henüz denenmedi"]] },
  { group: "Luca’da", rows: [["Muhasebe, Fiş İşlemleri", "Excel veri aktarımı"], ["Dosya, doğrulama kodu", "Yükle"], ["Önizleme", "Fiş Kes"]] },
];

const FAQ: Qa[] = [
  { q: "Fiş fotoğrafı nereye gidiyor?", a: "Okunmak için yapay zeka hizmetine (Anthropic, ABD) gönderilir. Accountie fotoğrafı sunucuda saklamaz; kontrol ekranındaki görüntü yalnız sizin cihazınızda durur." },
  { q: "Luca’ya kendisi mi kaydediyor?", a: "Hayır. Excel dosyasını Luca’ya siz yüklersiniz; eklenti satırları doldurur, Kaydet’e basmaz. Onayınız olmadan kayıt oluşmaz." },
  { q: "Hangi belgeler okunuyor?", a: "Yazar kasa (ÖKC) fişleri. Fatura, e-Arşiv ve gider pusulası şimdilik okunmuyor." },
  { q: "KDV’yi yeniden hesaplıyor mu?", a: "Hayır. Matrah, toplamdan fişte yazan KDV düşülerek bulunur. KDV okunamazsa orandan hesaplanır ve satıra not düşülür." },
  { q: "Okuma yanlış çıkarsa?", a: "Okunamayan alan boş kalır ve işaretlenir. Toplam ile KDV tutmazsa fiş bir kez daha okunur, yine tutmazsa uyarıyla size gelir." },
  { q: "Hesap kodlarını kim seçiyor?", a: "Siz. Yapay zeka yalnız kategori önerir; hesap kodu kendi kural tablonuzdan gelir." },
  { q: "Ücretli mi?", a: "Fiyat henüz belirlenmedi. Şu an hesap açmak ve fiş okutmak ücretsiz." },
  { q: "Telefonda uygulama gibi açılır mı?", a: "Evet. Ana ekrana eklediğinizde ayrı bir uygulama gibi açılır, Fiş çek tek dokunuştur." },
];

const CREDITS = [
  { title: "Pittsboro Merchant Business Ledger", by: null, license: "kamu malı", licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/", page: "https://commons.wikimedia.org/wiki/File:Pittsboro_Merchant_Business_Ledger_-_DPLA_-_4cbfce8f8f08c14f851ab74af046c082_(page_258).jpg" },
  { title: "Nealon pp135-136", by: "Deseronto Archives", license: "bilinen telif kısıtlaması yok", licenseUrl: "https://www.flickr.com/commons/usage/", page: "https://commons.wikimedia.org/wiki/File:Nealon_pp135-136_(3301348540).jpg" },
  { title: "Keystrokes in a vintage mechanical calculator", by: "Subhashish Panigrahi", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", page: "https://commons.wikimedia.org/wiki/File:Keystrokes_in_a_vintage_mechanical_calculator.webm" },
  { title: "Antique cash register", by: "Thomas Quine", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", page: "https://commons.wikimedia.org/wiki/File:Antique_cash_register_(43766820702).jpg" },
];

const PATH = [
  { clause: "Önce telefonla çekilir.", card: (
    <>
      <p className="ui-card-head"><span>Fiş</span><span className="status" data-step>Okunuyor…</span></p>
      <div className="thermal thermal-mini" aria-label="Çekilen fişin termal baskısı" role="group" translate="no">
        <p className="thermal-vendor">{VENDOR}</p>
        <p className="thermal-row"><span>FİŞ NO 0047</span><span>05.09.2026</span></p>
        <p className="thermal-row"><span>KDV %10</span><span>*793,18</span></p>
        <p className="thermal-row thermal-total"><span>TOPLAM</span><span>*8.725,00</span></p>
      </div>
      <p className="ui-meta" data-step>Fotoğraf cihazınızda kalır.</p>
    </>
  ) },
  { clause: "Sonra satırları okunur.", card: (
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
      <p className="ui-meta" data-step>1 fiş, 3 satır</p>
    </>
  ) },
];

export default function LandingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
      <HomeMotion />
      <main id="icerik" tabIndex={-1} className="home">
        {/* Hero: two tones, the counter is the picture */}
        <section className="hero" aria-labelledby="hero-title">
          <header className="hero-bar">
            <Link className="brand hero-brand" href="/" translate="no"><BrandMark />Accountie</Link>
            <div className="hero-actions">
              <span className="theme-wide"><ThemeSwitch /></span>
              <span className="theme-narrow"><ThemeCycle /></span>
              <Link className="btn hero-login" href="/giris">Giriş yap</Link>
            </div>
          </header>
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
            <div className={`path-field path-field-${i + 1}`} key={f.clause} data-reveal>
              {i === 0 ? <h2 className="t-head path-title" id="path-title">Bir fişin yolu</h2> : null}
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
              Elle tutulan defterde de, Luca’da da borç ile alacak eşit olmadan kayıt kapanmaz. Accountie tutmayan fişi onaya göndermez.
            </p>
          </div>
          <figure className="rule-figure rule-figure-book" data-reveal="shutter" style={cssVars({ "--r": 1 })}>
            <div className="frame"><Image src={ledger1870} placeholder="blur" alt="Açık duran el yazısı bir hesap defteri, iki sayfada isimler, tarihler ve tutar sütunları; yanında bir kalem" sizes="(max-width: 900px) 100vw, 64vw" /></div>
            <figcaption>Elle tutulmuş bir hesap defterinin iki sayfası, 1869-1870.</figcaption>
          </figure>
          <figure className="rule-figure rule-figure-clip" data-reveal="shutter" style={cssVars({ "--r": 0 })}>
            <LoopVideo src={{ mp4: "/gorseller/hesap-makinesi.mp4", webm: "/gorseller/hesap-makinesi.webm" }} poster="/gorseller/hesap-makinesi-poster.jpg" width={854} height={480} />
            <figcaption>Eski bir toplama makinesinde tuşlama.</figcaption>
          </figure>
          <figure className="rule-figure rule-figure-register" data-reveal="shutter" style={cssVars({ "--r": 1 })}>
            <div className="frame"><Image src={register} placeholder="blur" alt="Ahşap tezgâh üstünde eski, pirinç kaplı mekanik bir yazar kasa ve para çekmecesi" sizes="(max-width: 900px) 100vw, 40vw" /></div>
            <figcaption>Mekanik bir yazar kasa, bugünkü ÖKC’nin atası.</figcaption>
          </figure>
        </section>

        {/* showcase: the six pieces at once, on the dark field */}
        <section className="show" aria-labelledby="show-title">
          <div className="show-inner wrap">
            <h2 className="t-head show-title" id="show-title" data-reveal>Kontrol ekranından Luca’ya</h2>
            <div className="show-grid">
              {PIECES.map((p, i) => (
                <figure className="show-piece" key={p.name} style={cssVars({ "--span": p.span, "--r": i % 2 })} data-reveal>
                  <div className="show-ui" data-ui>{p.body}</div>
                  <figcaption>
                    <h3 className="show-name">{p.name}</h3>
                    <p className="show-text">{p.text}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* features: panel with margin notes */}
        <section className="feat wrap" aria-labelledby="feat-title">
          <h2 className="t-head feat-title" id="feat-title" data-reveal>Sizin hesap planınız</h2>
          <div className="feat-panel" data-ui aria-label="Hesap kuralları paneli" role="group">
            <p className="ui-panel-head">Hesap kuralları</p>
            {PART_TITLES.map((t, i) => (
              <div className="feat-part" data-part={i + 1} key={t} style={{ gridRow: i + 2 }}>
                <p className="ui-part-title">{t}</p>
                <RulePart n={i + 1} />
              </div>
            ))}
          </div>
          {NOTES.map((n, i) => (
            <div className={`feat-note ${i % 2 ? "feat-note-r" : "feat-note-l"}`} data-note={i + 1} key={n.name} style={{ gridRow: i + 3, ...cssVars({ "--r": 2 + (i >> 1) }) }} data-reveal>
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
              <div className="routes-group" key={g.group} data-reveal style={cssVars({ "--r": gi + 1 })}>
                <h3 className="routes-group-name">{g.group}</h3>
                <ul>
                  {g.rows.map(([name, value]) => (
                    <li key={name}><span className="dot" aria-hidden="true" /><span className="routes-name">{name}</span><span className="routes-value">{value}</span></li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="routes-tip" data-reveal style={cssVars({ "--r": 5 })}>İlk aktarımı tek fişle deneyin: Luca’nın önizlemesinde satırları kontrol edip Fiş Kes’e basın.</p>
          </div>
          <figure className="routes-figure" data-reveal="shutter" style={cssVars({ "--r": 1 })}>
            <div className="frame"><Image src={ledger1833} placeholder="blur" alt="Elle tutulmuş 1833 tarihli bir tüccar hesap defteri sayfası, isimler ve iki sütun tutar" sizes="(max-width: 900px) 100vw, 46vw" /></div>
            <figcaption>Elle tutulmuş bir tüccar hesap defteri sayfası, 1833.</figcaption>
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
    </>
  );
}
