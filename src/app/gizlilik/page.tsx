import type { Metadata } from "next";
import Link from "next/link";
import { SiteBar } from "@/components/site/SiteBar";
import "./gizlilik.css";

export const metadata: Metadata = {
  title: "Gizlilik",
  description: "Accountie hangi veriyi hangi amaçla işler, fiş fotoğrafı nereye gider, ne saklanır ve ne saklanmaz.",
};
export const dynamic = "force-static";

// Facts only, from docs/TECH_DESIGN.md (photo handling, rate limits) and src/db/schema.ts (what is stored). No user data on this page.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Fiş fotoğrafı ve belgeler",
    body: [
      "Telefonda çektiğiniz fotoğraf tarayıcıda küçültülür ve sunucuya gönderilir. Sunucu konum ve cihaz bilgisini (EXIF, GPS) siler, fotoğrafı okunmak için yapay zeka hizmetine gönderir: Anthropic, Amerika Birleşik Devletleri.",
      "Yüklediğiniz PDF belge (ör. yurt dışı hizmet faturası) olduğu gibi aynı hizmete okunmak için gönderilir.",
      "Fotoğraf ve belge sunucuda ve veritabanında saklanmaz. Kontrol ekranında gördüğünüz görüntü yalnız o tarayıcı sekmesinin belleğinde durur; sekmeyi kapatınca silinir.",
      "Dövizli bir faturada sunucu, TL karşılığı için Türkiye Cumhuriyet Merkez Bankası'nın herkese açık kur bülteninden o günün kurunu alır. Bu istekte yalnız tarih ve para birimi vardır.",
    ],
  },
  {
    title: "Saklananlar",
    body: [
      "Hesabınız: ad soyad ve e-posta. Giriş, kimlik doğrulama hizmeti Supabase Auth üzerinden yapılır; şifreniz orada özetlenerek tutulur, Accountie şifreyi saklamaz.",
      "Fişten okunan alanlar: satıcı adı, vergi numarası, fiş numarası, tarih, KDV satırları, toplam, ödeme şekli ve kategori. Bunlardan hazırlanan yevmiye satırları ve sizin hesap kurallarınız.",
      "Veriler Supabase Postgres veritabanında (Frankfurt, Almanya), yalnız sizin hesabınıza bağlı olarak tutulur. Başka bir kullanıcı sizin fişlerinizi göremez.",
    ],
  },
  {
    title: "Chrome eklentisi",
    body: [
      "Eklenti yalnız sizin onaylı fişlerinizin yevmiye satırlarını Accountie'den alır ve Luca'da açık olan Fiş Detayı ekranına yazar. Luca'da kaydetmek, silmek ve değiştirmek her zaman sizdedir.",
      "\"Luca'dan firmaları çek\" düğmesine bastığınızda eklenti, Luca'da oturumunuzla açık olan firmaların unvanını, vergi numarasını ve hesap planını okuyup Accountie'deki hesabınıza kaydeder. Luca şifrenizi ve çerezlerinizi okumaz, saklamaz.",
      "Eklentinin anahtarı yalnız o bilgisayarın tarayıcısında durur, eşitlenmez. Anahtar her kullanımda 30 gün uzar; 30 gün kullanılmazsa, şifreniz sıfırlanınca ya da Kurallar sayfasında iptal edilince geçersiz olur.",
    ],
  },
  {
    title: "Kötüye kullanımı önleme",
    body: [
      "Giriş, kayıt ve şifre yenileme denemeleri sayılır. Sayım için IP adresi ve e-posta tek yönlü özetlenir; tabloda açık hâlleri bulunmaz. Bir günden eski sayımlar yeni denemelerle birlikte temizlenir.",
      "Formlarda Cloudflare Turnstile açıksa, bot denetimi için tarayıcınız Cloudflare ile bağlantı kurar.",
    ],
  },
  {
    title: "Çerezler ve tarayıcı belleği",
    body: [
      "Giriş yaptığınızda oturumunuzu açık tutan zorunlu bir çerez kullanılır. Analitik ya da reklam çerezi yoktur.",
      "Tema seçiminiz ve çerez bildirimini kapattığınız bilgisi bu tarayıcının belleğinde durur, sunucuya gönderilmez.",
    ],
  },
  {
    title: "Haklarınız",
    body: [
      "Kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini ve silinmesini isteme hakkınız vardır (6698 sayılı KVKK, madde 11).",
      "Hesabın silinmesi ve diğer talepler için iletişim adresi yayın öncesinde bu sayfaya eklenecektir.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteBar />
      <main id="icerik" tabIndex={-1} className="legal">
        <h1 className="legal-title">Gizlilik</h1>
        <p className="legal-lead">
          <span translate="no">Accountie</span> yazar kasa fişinden Luca yevmiye kaydı hazırlar. Bu sayfa hangi verinin nereye gittiğini ve neyin saklandığını anlatır.
          Hukuki inceleme tamamlanana kadar KVKK aydınlatma metninin yerine geçmez.
        </p>
        <div className="legal-body">
          {SECTIONS.map((s, i) => (
            <section key={s.title} aria-labelledby={`g-${i}`}>
              <h2 id={`g-${i}`}>{s.title}</h2>
              {s.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
            </section>
          ))}
        </div>
        <p className="legal-back"><Link href="/">Ana sayfaya dönün</Link></p>
      </main>
    </>
  );
}
