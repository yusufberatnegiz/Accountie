import type { Metadata } from "next";
import Link from "next/link";
import { CookieNote } from "@/components/site/CookieNote";
import { SiteBar } from "@/components/site/SiteBar";
import { Faq, type Qa } from "@/components/home/Faq";
import { Reveal } from "@/components/home/Reveal";
import { Stage } from "@/components/home/Stage";
import { journalFor, OTOPARK, SAMPLES, shownAccountName } from "@/components/home/samples";
import { Thermal } from "@/components/home/Thermal";
import { formatTrAmount } from "@/lib/money";
import "@/components/home/landing.css";

// Public and static: no session, no user data.
export const dynamic = "force-static";

const OTOPARK_LINES = journalFor(OTOPARK, "partner").lines;

export const metadata: Metadata = {
  title: { absolute: "Accountie: yazar kasa fişinden Luca yevmiye kaydı" },
  description: "Yazar kasa fişini telefonla çekin, Luca Fiş Detayı satırları hesap planınıza göre hazırlansın. Kontrol edip onaylayın, Excel ile Luca'ya aktarın.",
};

// The hero's receipt and the lines the product makes from it with the default rules (partner card).
const SAMPLE = SAMPLES[0];
const LINES = journalFor(SAMPLE, "partner").lines;

// The receipt into the hub, the hub into Luca (viewBox 1000x180; nodes sit at the same points in percent).
const BEAMS = ["M 210 90 L 415 90", "M 585 90 L 790 90"];

/** A figure that rolls up from 0 when its section enters (landing.css). The text is the real figure; the drums are decoration. */
function roll(text: string) {
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span className="l-roll" aria-hidden="true">{[...text].map((c, i) => /\d/.test(c)
        ? <span key={i} className="l-drum" style={{ "--d": Number(c), "--i": i } as React.CSSProperties}><span>0 1 2 3 4 5 6 7 8 9</span></span>
        : <span key={i}>{c}</span>)}</span>
    </>
  );
}

const FAQ: Qa[] = [
  { q: "Fiş fotoğrafı nereye gidiyor?", a: "Okunmak için yapay zeka hizmetine (Anthropic, ABD) gönderilir. Accountie fotoğrafı sunucuda saklamaz; kontrol ekranındaki görüntü yalnız sizin cihazınızda durur." },
  { q: "Luca’ya kendisi mi kaydediyor?", a: "Hayır. Excel dosyasını Luca’ya siz yüklersiniz; eklenti satırları doldurur, Kaydet’e basmaz. Onayınız olmadan kayıt oluşmaz." },
  { q: "Hangi belgeler okunuyor?", a: "Yazar kasa (ÖKC) fişlerinin fotoğrafı. e-Fatura ve e-Arşiv faturalarını Luca kendisi alıyor. Kâğıt fatura ve gider pusulası şimdilik okunmuyor." },
  { q: "KDV’yi yeniden hesaplıyor mu?", a: "Hayır. Matrah, toplamdan fişte yazan KDV düşülerek bulunur. KDV okunamazsa orandan hesaplanır ve satıra not düşülür." },
  { q: "Okuma yanlış çıkarsa?", a: "Okunamayan alan boş kalır ve işaretlenir. Toplam ile KDV tutmazsa fiş bir kez daha okunur, yine tutmazsa uyarıyla size gelir." },
  { q: "Hesap kodlarını kim seçiyor?", a: "Siz. Yapay zeka yalnız kategori önerir; hesap kodu kendi kural tablonuzdan gelir." },
  { q: "Ücretli mi?", a: "Belge okuma kontörle ücretlendirilir: fiş ve Z raporu 1, fatura 2 kontör. Paketler 100 kontör 750 TL'den başlar (KDV dahil), kontörün süresi dolmaz. Kontör zorunlu olmadan önce hesabınızdaki e-postaya haber verilir." },
  { q: "Kişisel verilerim nasıl işleniyor?", a: "Hangi verinin hangi hizmete gittiği ve neyin saklandığı gizlilik sayfasında yazılı. Bağlantısı sayfanın altında." },
  { q: "Telefonda uygulama gibi açılır mı?", a: "Evet. Ana ekrana eklediğinizde ayrı bir uygulama gibi açılır, Fiş çek tek dokunuştur." },
];

export default function LandingPage() {
  return (
    <>
      <SiteBar />
      <main id="icerik" tabIndex={-1} className="land">
        <section className="l-hero l-wrap" aria-labelledby="hero-title">
          <p className="l-eyebrow"><span className="l-dot" aria-hidden="true" />Luca kullanan muhasebe büroları için</p>
          <h1 className="l-title" id="hero-title">Fişin fotoğrafı.<br /><em>Luca’ya</em> <span className="l-keep">hazır kayıt.</span></h1>
          <div className="l-lede">
            <p>Yazar kasa fişini telefonla çekin. Yevmiye satırları büronuzun kendi hesap kodlarıyla gelsin; siz yalnız kontrol edip onaylayın.</p>
            <div className="l-ctas">
              <a className="btn btn-lg" href="#ornek">Örnek fişi gör</a>
              <a className="btn btn-primary btn-lg" href="/kayit">Hesap oluştur</a>
            </div>
          </div>
        </section>

        <section className="l-stage l-wrap" id="ornek" aria-label="Örnek fiş ve Luca satırları" data-reveal>
          <Stage />
        </section>

        <section className="l-facts l-wrap" aria-label="Kısaca" data-reveal>
          <p><b>{roll("3")}</b><span>satır: gider, KDV, ödeme. Hesap kodunu model değil sizin kural tablonuz seçer.</span></p>
          <p><b>{roll("0,00")}</b><span>fark olmadan onay düğmesi açılmaz.</span></p>
          <p><b>{roll("1")}</b><span>tıkla, seçili fişler eklentiyle Luca Fiş Detayına alt alta yazılır; Kaydet’e siz basarsınız.</span></p>
          <p><b>{roll("~15 sn")}</b><span>fotoğraftan satırlara.</span></p>
        </section>

        {/* The material, brought back from the old page: thermal print fades as the section passes, the Luca record laid over it stays whole. */}
        <section className="l-paper l-wrap" aria-labelledby="paper-title" data-reveal>
          <div className="l-paper-copy">
            <h2 className="l-h2" id="paper-title">Termal fiş solar.</h2>
            <p>Yazar kasa fişi ısıyla basılır ve zamanla okunmaz olur. Fiş okunurken satırlarını çıkarın; kayıt Luca’da kalır.</p>
          </div>
          <figure className="l-paper-desk">
            {/* A picture of the material; its figures are in the card and the caption. */}
            <div className="l-paper-strip" aria-hidden="true"><Thermal sample={OTOPARK} printedPayment="KREDİ KARTI" /></div>
            <div className="l-paper-luca">
              <p className="l-paper-head"><span>Fiş {OTOPARK.receipt.receiptNo}, Luca kaydı</span><span className="status status-exported">Aktarıldı</span></p>
              <p className="l-paper-total"><span>Luca’da kayıtlı</span><strong>{formatTrAmount(OTOPARK_LINES.reduce((s, l) => s + l.creditKurus, 0))} TL</strong></p>
              <ul className="l-paper-codes" aria-label="Hesap satırları">
                {OTOPARK_LINES.map((l) => <li key={l.accountCode}><span translate="no">{l.accountCode}</span><span>{shownAccountName(l.accountName)}</span></li>)}
              </ul>
            </div>
            <figcaption>Fiş {OTOPARK.receipt.receiptNo}: kâğıt solar, satırları Luca’da kalır.</figcaption>
          </figure>
        </section>

        <section className="l-flow l-wrap" aria-labelledby="flow-title" data-reveal>
          <h2 className="l-h2" id="flow-title">Fişten Luca’ya tek yol.</h2>
          <p className="l-flow-lede">Fişin fotoğrafı sizin kural tablonuzla yevmiye satırlarına iner. Luca’ya giden her kayıt önce dengeden geçer.</p>
          <div className="l-flow-map">
            <svg className="l-beams" viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true">
              {BEAMS.map((d, i) => (
                <g key={d}><path className="l-beam-base" d={d} /><path className="l-beam" d={d} pathLength={1000} style={{ animationDelay: `${i * 0.45}s` }} /></g>
              ))}
            </svg>
            <ul className="l-nodes">
              <li className="l-node l-src"><b>Yazar kasa fişi</b><span>Telefonla fotoğraf</span></li>
              <li className="l-node l-hub"><b>Accountie</b><span>Okur, kurala göre satır kurar, dengeyi denetler</span></li>
              <li className="l-node l-out"><b>Luca</b><span>Excel dosyası ya da eklentiyle Fiş Detayı</span></li>
            </ul>
          </div>
        </section>

        <section className="l-rule l-wrap" id="kural" aria-labelledby="rule-title" data-reveal>
          <div className="l-rule-field">
            <div className="l-rule-text">
              <p className="l-small">Kural</p>
              <div>
                <h2 className="l-h2" id="rule-title">Borç alacağa eşit olmadan onay yok.</h2>
                <p>Okunan tutar tutmazsa fark kırmızıyla gösterilir, düğme kapalı kalır. Luca’ya dengesiz kayıt gitmez.</p>
              </div>
              <p className="l-small">Muhasebenin en eski kuralı, ekranın ilk kuralı.</p>
            </div>
            <div className="l-rule-vis">
              <div className="l-unbal" role="group" aria-label="Dengesiz örnek fiş">
                <p><span>Borç toplamı</span><span className="num">8.752,00</span></p>
                <p><span>Alacak toplamı</span><span className="num">8.725,00</span></p>
                <p className="l-diff"><span>Fark</span><b className="num">27,00</b></p>
                <span className="l-lock">Onayla · kapalı</span>
              </div>
            </div>
          </div>
        </section>

        <section className="l-steps l-wrap" aria-labelledby="path-title" data-reveal>
          <h2 className="l-h2" id="path-title">Üç adım. Hepsi bildiğiniz Luca ekranlarına çıkar.</h2>
          <ol className="l-cards">
            <li><span className="l-n">01</span><h3>Çekin</h3><p>Telefonun kendi kamerasıyla. Art arda çekilen fişler ayrı kayıt olur.</p>
              <span className="l-mini l-xl" translate="no">{SAMPLES.slice(0, 3).map((s, i) => (
                <span key={s.id}><span>{s.receipt.receiptNo}</span><span>{s.label}</span><span className={i < 2 ? "l-ok" : "muted"}>{i < 2 ? "okundu" : "okunuyor"}</span></span>
              ))}</span></li>
            <li><span className="l-n">02</span><h3>Kontrol edin</h3><p>Fiş ve satırlar tek ekranda; okunan her rakamın fişteki yeri işaretli.</p>
              <span className="l-mini l-xl" translate="no">
                <span><span>KDV %10</span><span className="to-luca">{LINES[1]?.accountCode}</span><span className="num">{formatTrAmount(LINES[1]?.debitKurus ?? 0)}</span></span>
                <span><span>TOPLAM</span><span className="to-luca">{LINES[2]?.accountCode}</span><span className="num">{formatTrAmount(LINES[2]?.creditKurus ?? 0)}</span></span>
                <span><span>Fark</span><span><span className="status status-approved">Dengede</span></span><span className="num">0,00</span></span>
              </span></li>
            <li><span className="l-n">03</span><h3>Luca’ya yükleyin</h3><p>Onaylı fişler tek Excel dosyasında: Muhasebe, Fiş İşlemleri, Excel veri aktarımı.</p>
              <span className="l-mini l-xl" translate="no">{LINES.map((l) => (
                <span key={l.accountCode}><span className="to-luca">{l.accountCode}</span><span>{SAMPLE.receipt.receiptNo}</span><span className="num">{formatTrAmount(l.debitKurus || l.creditKurus)}</span></span>
              ))}</span></li>
          </ol>
        </section>

        <section className="faq l-wrap" aria-labelledby="sss-title" id="sss">
          <Faq items={FAQ} titleId="sss-title" />
        </section>

        <section className="l-cta l-wrap" aria-labelledby="cta-title" data-reveal>
          <h2 className="l-title l-cta-title" id="cta-title">İlk fişinizi<br />bugün çekin.</h2>
          <div className="l-lede">
            <p>Hesabı açtığınızda varsayılan hesap planı kural tablonuza kopyalanır; kendi kodlarınızı bir kez girin, gerisi her fişte hazır gelir.</p>
            <div className="l-ctas"><a className="btn btn-primary btn-lg" href="/kayit">Hesap oluştur</a></div>
          </div>
        </section>
      </main>

      <Reveal />
      <footer className="l-foot l-wrap">
        <p><span translate="no">Accountie</span>, yazar kasa fişinden Luca yevmiye kaydı hazırlar.</p>
        <nav aria-label="Alt bağlantılar">
          <a href="/giris">Giriş yap</a>
          <a href="/kayit">Hesap oluştur</a>
          <a href="#sss">Sık sorulanlar</a>
          <Link href="/gizlilik" prefetch={false}>Gizlilik</Link>
          <Link href="/kvkk" prefetch={false}>KVKK</Link>
          <Link href="/kosullar" prefetch={false}>Kullanım Koşulları</Link>
          <Link href="/mesafeli-satis" prefetch={false}>Mesafeli Satış</Link>
          <Link href="/iptal-iade" prefetch={false}>İptal ve İade</Link>
          <Link href="/destek" prefetch={false}>Bize ulaşın</Link>
        </nav>
      </footer>
      <CookieNote />
    </>
  );
}
