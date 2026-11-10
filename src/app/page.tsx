import type { Metadata } from "next";
import Link from "next/link";
import { CookieNote } from "@/components/site/CookieNote";
import { SiteBar } from "@/components/site/SiteBar";
import { Faq, type Qa } from "@/components/home/Faq";
import { journalFor, SAMPLES, shownAccountName } from "@/components/home/samples";
import { Thermal } from "@/components/home/Thermal";
import { formatTrAmount } from "@/lib/money";
import "@/components/home/landing.css";

// Public and static: no session, no user data.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "Accountie: yazar kasa fişinden Luca yevmiye kaydı" },
  description: "Yazar kasa fişini telefonla çekin, Luca Fiş Detayı satırları hesap planınıza göre hazırlansın. Kontrol edip onaylayın, Excel ile Luca'ya aktarın.",
};

// The hero's receipt and the lines the product makes from it with the default rules (partner card).
const SAMPLE = SAMPLES[0];
const LINES = journalFor(SAMPLE, "partner").lines;
const TOTAL = formatTrAmount(SAMPLE.receipt.totalKurus ?? 0);

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

export default function LandingPage() {
  return (
    <>
      <SiteBar />
      <main id="icerik" tabIndex={-1} className="land">
        <section className="l-hero l-wrap" aria-labelledby="hero-title">
          <p className="l-eyebrow"><span className="l-dot" aria-hidden="true" />Luca kullanan muhasebe büroları için</p>
          <h1 className="l-title" id="hero-title">Fişin fotoğrafı.<br /><em>Luca’ya</em> hazır kayıt.</h1>
          <div className="l-lede">
            <p>Yazar kasa fişini telefonla çekin. Yevmiye satırları büronuzun kendi hesap kodlarıyla gelsin; siz yalnız kontrol edip onaylayın.</p>
            <div className="l-ctas">
              <a className="btn btn-lg" href="#ornek">Örnek fişi gör</a>
              <Link className="btn btn-primary btn-lg" href="/kayit">Hesap oluştur</Link>
            </div>
          </div>
        </section>

        <section className="l-stage l-wrap" id="ornek" aria-label="Örnek fiş ve Luca satırları">
          <div className="l-plate">
            <div className="l-receipt"><Thermal sample={SAMPLE} printedPayment="KREDİ KARTI" hot={{ kind: "vat", rate: 10 }} /></div>
            <span className="l-flight" aria-hidden="true"><span>{formatTrAmount(SAMPLE.receipt.vatLines[0].vatKurus ?? 0)}</span></span>
            <figure className="l-ledger">
              <figcaption><b>Fiş {SAMPLE.receipt.receiptNo} · Örnek Balık Lokantası</b><span className="status status-draft">Kontrol bekliyor</span></figcaption>
              <table>
                <thead><tr><th scope="col">Hesap</th><th scope="col">Açıklama</th><th scope="col" className="num">Borç</th><th scope="col" className="num">Alacak</th></tr></thead>
                <tbody>
                  {LINES.map((l) => (
                    <tr key={l.accountCode}>
                      <td className="to-luca code" translate="no">{l.accountCode}</td>
                      <td>{shownAccountName(l.accountName)}</td>
                      <td className="num">{l.debitKurus ? formatTrAmount(l.debitKurus) : ""}</td>
                      <td className="num">{l.creditKurus ? formatTrAmount(l.creditKurus) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="l-balance"><span>Fark yok, dengede</span><span className="num">Borç {TOTAL} · Alacak {TOTAL} · 0,00 ✓</span></p>
            </figure>
          </div>
        </section>

        <section className="l-facts l-wrap" aria-label="Kısaca">
          <p><b>3</b><span>satır: gider, KDV, ödeme. Hesap kodunu model değil sizin kural tablonuz seçer.</span></p>
          <p><b>0,00</b><span>fark olmadan onay düğmesi açılmaz.</span></p>
          <p><b>1</b><span>Excel dosyası; Luca’nın Excel veri aktarımı ekranından yüklenir.</span></p>
          <p><b>~15 sn</b><span>fotoğraftan satırlara.</span></p>
        </section>

        <section className="l-rule l-wrap" id="kural" aria-labelledby="rule-title">
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

        <section className="l-steps l-wrap" aria-labelledby="path-title">
          <h2 className="l-h2" id="path-title">Üç adım. Hepsi bildiğiniz Luca ekranlarına çıkar.</h2>
          <ol className="l-cards">
            <li><span className="l-n">01</span><h3>Çekin</h3><p>Telefonun kendi kamerasıyla. Art arda çekilen fişler ayrı kayıt olur.</p>
              <p className="l-mini">Fiş çek <span className="muted">· 4 fiş okunuyor</span></p></li>
            <li><span className="l-n">02</span><h3>Kontrol edin</h3><p>Fiş ve satırlar tek ekranda; okunan her rakamın fişteki yeri işaretli.</p>
              <p className="l-mini"><span className="status status-approved">Dengede</span> <span translate="no">{LINES.map((l) => l.accountCode).join(" · ")}</span></p></li>
            <li><span className="l-n">03</span><h3>Luca’ya yükleyin</h3><p>Onaylı fişler tek Excel dosyasında: Muhasebe, Fiş İşlemleri, Excel veri aktarımı.</p>
              <span className="l-mini l-xl" translate="no">{LINES.slice(0, 2).map((l) => (
                <span key={l.accountCode}><span className="to-luca">{l.accountCode}</span><span>{SAMPLE.receipt.receiptNo}</span><span className="num">{formatTrAmount(l.debitKurus)}</span></span>
              ))}</span></li>
          </ol>
        </section>

        <section className="faq l-wrap" aria-labelledby="sss-title" id="sss">
          <Faq items={FAQ} titleId="sss-title" />
        </section>

        <section className="l-cta l-wrap" aria-labelledby="cta-title">
          <h2 className="l-title l-cta-title" id="cta-title">İlk fişinizi<br />bugün çekin.</h2>
          <div className="l-lede">
            <p>Hesabı açtığınızda varsayılan hesap planı kural tablonuza kopyalanır; kendi kodlarınızı bir kez girin, gerisi her fişte hazır gelir.</p>
            <div className="l-ctas"><Link className="btn btn-primary btn-lg" href="/kayit" prefetch={false}>Hesap oluştur</Link></div>
          </div>
        </section>
      </main>

      <footer className="l-foot l-wrap">
        <p><span translate="no">Accountie</span>, yazar kasa fişinden Luca yevmiye kaydı hazırlar.</p>
        <nav aria-label="Alt bağlantılar">
          <Link href="/giris" prefetch={false}>Giriş yap</Link>
          <Link href="/kayit" prefetch={false}>Hesap oluştur</Link>
          <a href="#sss">Sık sorulanlar</a>
          <Link href="/gizlilik" prefetch={false}>Gizlilik</Link>
        </nav>
      </footer>
      <CookieNote />
    </>
  );
}
