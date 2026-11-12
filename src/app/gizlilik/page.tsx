import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, PROVIDER, type LegalSection } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Gizlilik",
  description: "Accountie hangi veriyi hangi amaçla işler, fiş fotoğrafı nereye gider, ne saklanır ve ne saklanmaz.",
};
export const dynamic = "force-static";

// Facts only, from docs/TECH_DESIGN.md (photo handling, rate limits) and src/db/schema.ts (what is stored). No user data on this page.
const SECTIONS: LegalSection[] = [
  {
    title: "Fiş fotoğrafı ve belgeler",
    body: [
      "Telefonda çektiğiniz fotoğraf tarayıcıda küçültülür ve sunucuya gönderilir. Sunucu konum ve cihaz bilgisini (EXIF, GPS) siler, fotoğrafı okunmak için yapay zekâ hizmetine gönderir: Anthropic, Amerika Birleşik Devletleri.",
      "Yüklediğiniz PDF belge (ör. yurt dışı hizmet faturası) olduğu gibi aynı hizmete okunmak için gönderilir.",
      "Anthropic, API üzerinden gönderilen belgeleri kendi modellerini eğitmek için kullanmaz; kötüye kullanımı denetlemek için en çok 30 gün tutabilir, sonra siler. Accountie de belgelerinizi ve kayıtlarınızı yapay zekâ eğitimi için kullanmaz.",
      "Fotoğraf ve belge Accountie'nin sunucusunda ve veritabanında saklanmaz. Kontrol ekranında gördüğünüz görüntü yalnız o tarayıcı sekmesinin belleğinde durur; sekmeyi kapatınca silinir.",
      "Dövizli bir faturada sunucu, TL karşılığı için Türkiye Cumhuriyet Merkez Bankası'nın herkese açık kur bülteninden o günün kurunu alır. Bu istekte yalnız tarih ve para birimi vardır.",
    ],
  },
  {
    title: "Saklananlar",
    body: [
      "Hesabınız: ad soyad ve e-posta. Giriş, kimlik doğrulama hizmeti Supabase Auth üzerinden yapılır; şifreniz orada özetlenerek tutulur, Accountie şifreyi saklamaz.",
      "Fiş, Z raporu ve faturadan okunan alanlar: satıcı adı, vergi numarası, belge numarası, tarih, KDV satırları, toplam, para birimi, ödeme şekli ve kategori. Bunlardan hazırlanan yevmiye satırları, sizin hesap kurallarınız ve firmalarınızın unvanı, vergi numarası ve hesap planı.",
      "Veriler Supabase Postgres veritabanında (Frankfurt, Almanya), yalnız sizin hesabınıza bağlı olarak tutulur. Başka bir kullanıcı sizin fişlerinizi göremez.",
    ],
  },
  {
    title: "Ödeme",
    body: [
      "Kontör ödemesi iyzico'nun güvenli ödeme sayfasında alınır. Kart numarası ve güvenlik kodu Accountie'ye gelmez, Accountie'de saklanmaz.",
      "Ödeme için girdiğiniz fatura bilgileri (ad soyad ya da unvan, VKN ya da TCKN, vergi dairesi, cep telefonu, adres) bir sonraki alımda hazır gelsin diye saklanır ve iyzico'ya iletilir. Satın almanın kaydı ve o andaki fatura bilgileri, hesap silinse de mevzuatın öngördüğü süre boyunca saklanır.",
      "Okunan her belgenin kaç kontör düştüğü ve hangi firmaya yüklendiği kaydedilir; Kontör sayfasındaki firma dökümü buradan gelir.",
    ],
  },
  {
    title: "Chrome eklentisi",
    body: [
      "Eklenti yalnız sizin onaylı fişlerinizin yevmiye satırlarını Accountie'den alır ve Luca'da açık olan Fiş Detayı ekranına yazar. Luca'da kaydetmek, silmek ve değiştirmek her zaman sizdedir.",
      "\"Luca'dan firmaları çek\" düğmesine bastığınızda eklenti, Luca'da oturumunuzla açık olan firmaların unvanını, vergi numarasını ve hesap planını okuyup Accountie'deki hesabınıza kaydeder. Luca şifrenizi ve çerezlerinizi okumaz, saklamaz.",
      "Eklentinin Luca'dan ve Accountie'den aldığı veriler yalnız bu işler için kullanılır; satılmaz, reklam için ya da başkasına aktarılmak için kullanılmaz (Chrome Web Store Limited Use kurallarına uygun).",
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
      "Tema seçiminiz, menüyü daraltıp daraltmadığınız ve çerez bildirimini kapattığınız bilgisi bu tarayıcının belleğinde durur, sunucuya gönderilmez.",
    ],
  },
  {
    title: "Haklarınız",
    body: [
      "Kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini ve silinmesini isteme hakkınız vardır (6698 sayılı KVKK, madde 11).",
      "Hesabınızı ve bütün verilerinizi panelde Hesap menüsündeki \"Hesabı sil\" ile kendiniz silebilirsiniz; silme hemen yapılır. Kanunen saklanması gereken ödeme kayıtları bunun dışındadır.",
      `Diğer talepler için: ${PROVIDER.email}. Başvuru yolları ve süreler Aydınlatma Metninde yazılıdır.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik" prefix="g" sections={SECTIONS}
      lead={<><span translate="no">Accountie</span> yazar kasa fişi, Z raporu ve faturadan Luca yevmiye kaydı hazırlar. Bu sayfa hangi verinin nereye gittiğini ve neyin saklandığını sade bir dille anlatır. Resmi metinler: <Link href="/kvkk">KVKK Aydınlatma Metni</Link> ve <Link href="/kosullar">Kullanım Koşulları</Link>.</>} />
  );
}
