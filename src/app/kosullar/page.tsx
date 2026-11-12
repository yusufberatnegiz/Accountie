import type { Metadata } from "next";
import { LegalPage, PROVIDER, type LegalSection } from "@/components/site/LegalPage";
import { TERMS_VERSION } from "@/app/giris/validation";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "Accountie hizmet sözleşmesi: hizmetin kapsamı, kaydın kontrolü, müşteri verileri, ücret, sorumluluk ve fesih.",
};
export const dynamic = "force-static";

const date = TERMS_VERSION.split("-").reverse().join(".");

// Draft for the lawyer's review; the structure follows Turkish SaaS service agreements (taraflar, konu, veri işleme, sorumluluk, fesih, yetki).
const SECTIONS: LegalSection[] = [
  {
    title: "1. Taraflar",
    body: [
      `Bu sözleşme, Accountie hizmetini sunan ${PROVIDER.name} (${PROVIDER.address}; ${PROVIDER.taxNo}) ("Accountie") ile Accountie hesabı açan kişi ya da büro ("Kullanıcı") arasındadır.`,
      "Kullanıcı, kayıt formundaki kutuyu işaretleyerek bu koşulları okuduğunu ve kabul ettiğini beyan eder. Kabul tarihi ve kabul edilen metnin tarihi hesapla birlikte kaydedilir.",
      "Hizmet mali müşavirler, muhasebe büroları ve işletmeler içindir. Kullanıcı, hizmeti mesleki ya da ticari amaçla kullandığını beyan eder; bu nedenle tüketici mevzuatı (6502 sayılı Kanun) bu sözleşmeye uygulanmaz.",
    ],
  },
  {
    title: "2. Hizmetin konusu",
    body: [
      "Accountie, Kullanıcının yüklediği yazar kasa fişi, Z raporu ve yurt dışı hizmet faturası gibi belgeleri yapay zekâ ile okur ve Kullanıcının hesap kurallarına göre yevmiye kaydı taslağı hazırlar.",
      "Hazırlanan kayıtlar Excel dosyası olarak ya da Accountie Chrome eklentisiyle Luca'ya aktarılabilir.",
      "Accountie muhasebe kaydını kendisi yapmaz, beyanname vermez, mesleki danışmanlık sunmaz.",
    ],
  },
  {
    title: "3. Kaydın kontrolü Kullanıcıdadır",
    body: [
      "Belge okuma ve hesap eşleme otomatik yapılır; hatalı olabilir. Her taslak, Kullanıcı onaylamadan Luca'ya aktarılmaz.",
      "Kayıtların belgeye, mevzuata ve muhasebe ilkelerine uygunluğunu kontrol etmek Kullanıcının sorumluluğundadır: tutar, KDV, hesap kodu, tarih ve belge türü.",
      "Luca'da kaydetme her zaman Kullanıcı tarafından yapılır. Accountie eklentisi Luca'da kayıt kaydetmez, silmez, değiştirmez.",
    ],
  },
  {
    title: "4. Hesap ve eklenti",
    body: [
      "Kullanıcı hesap bilgilerini doğru verir ve şifresini korur. Hesapla yapılan işlemlerden Kullanıcı sorumludur. Yetkisiz kullanımı fark edince şifresini değiştirir ve Accountie'ye bildirir.",
      "Eklenti anahtarı yalnız Kullanıcının tarayıcısında saklanır. Kullanıcı anahtarı Kurallar sayfasından istediği an iptal edebilir.",
      "Hizmet; tersine mühendislik, otomatik toplu istek, başkasının verisine erişme girişimi ya da hukuka aykırı belge yüklemek için kullanılamaz. Bu durumda Accountie hesabı askıya alabilir.",
    ],
  },
  {
    title: "5. Müşteri verileri",
    body: [
      "Kullanıcının yüklediği belgeler ve bunlardan hazırlanan kayıtlar Kullanıcıya aittir. Accountie bunları yalnız hizmeti sunmak için işler; satmaz, reklam için kullanmaz, yapay zekâ eğitimi için kullanmaz ve kullandırmaz.",
      "Belgelerdeki kişisel veriler bakımından Kullanıcı veri sorumlusu, Accountie veri işleyendir (6698 sayılı KVKK). Kullanıcı, belgelerini yüklediği müşterilerini kişisel verilerinin bu hizmette işlenmesi hakkında aydınlatmakla yükümlüdür.",
      "Accountie veri işleyen olarak: veriyi yalnız Kullanıcının talimatı ve bu sözleşme çerçevesinde işler; gerekli teknik ve idari tedbirleri alır; çalışanlarını ve hizmet sağlayıcılarını gizlilikle bağlar; bir veri ihlalini öğrendiğinde Kullanıcıya en geç 24 saat içinde bildirir; Kullanıcının müşterileri bakımından sır saklama yükümlülüğüne (3568 sayılı Kanun md. 43) uygun davranır.",
      "Hizmetin sunulması için şu alt hizmet sağlayıcılar kullanılır: Anthropic (ABD, belge okuma), Supabase (Almanya'daki sunucular, veritabanı ve kimlik doğrulama), Vercel (ABD, uygulama barındırma), Cloudflare (ABD, bot denetimi). Bu listedeki değişiklikler gizlilik sayfasında yayımlanır.",
      "Belge fotoğrafları ve PDF'ler Accountie'de saklanmaz; okuma için Anthropic'e gönderilir, Anthropic en çok 30 gün tutabilir ve model eğitiminde kullanmaz. Saklanan alanlar Gizlilik sayfasında ve Aydınlatma Metninde yazılıdır.",
    ],
  },
  {
    title: "6. Ücret",
    body: [
      "Hizmet şu an ücretsizdir. Ücretlendirme başlamadan en az 30 gün önce Kullanıcının e-posta adresine fiyat ve koşullar bildirilir.",
      "Ücretli döneme geçmek istemeyen Kullanıcı, bildirimden sonra hesabını kapatabilir; ücretsiz dönemde hazırlanan kayıtlar için ücret istenmez.",
    ],
  },
  {
    title: "7. Hizmetin sürekliliği",
    body: [
      "Accountie hizmetin kesintisiz çalışması için makul özeni gösterir; bakım, alt hizmet sağlayıcı arızası ya da Luca'nın ekranlarındaki değişiklikler nedeniyle hizmet veya eklenti geçici olarak çalışmayabilir.",
      "Luca, Luca Yazılım'ın ürünüdür. Accountie Luca Yazılım'la bağlı değildir ve onun tarafından onaylanmamıştır. Luca'nın kullanım koşullarına uymak Kullanıcının sorumluluğundadır.",
      "Accountie hizmeti geliştirebilir, değiştirebilir. Bir özelliğin kaldırılması Kullanıcının hazırlanmış kayıtlarına erişimini engellemez.",
    ],
  },
  {
    title: "8. Sorumluluk",
    body: [
      "Accountie, Kullanıcının kontrol edip onayladığı kayıtlardan doğan vergi, ceza, gecikme zammı ve benzeri sonuçlardan sorumlu değildir.",
      "Accountie'nin bu sözleşmeden doğan toplam sorumluluğu, zararın doğduğu tarihten önceki 12 ayda Kullanıcının ödediği hizmet bedeliyle sınırlıdır. Kâr kaybı gibi dolaylı zararlardan Accountie sorumlu değildir.",
      "Bu sınırlamalar, kanunen sınırlanamayan hâllerde, özellikle kast ve ağır ihmalde uygulanmaz.",
    ],
  },
  {
    title: "9. Fikri haklar",
    body: [
      "Accountie yazılımı, eklentisi, arayüzü ve markası üzerindeki haklar Accountie'ye aittir. Kullanıcıya, sözleşme süresince hizmeti kendi işinde kullanma hakkı verilir; bu hak devredilemez.",
    ],
  },
  {
    title: "10. Süre ve fesih",
    body: [
      "Sözleşme, hesap açılınca başlar ve süresizdir. Kullanıcı istediği an hesabının kapatılmasını isteyebilir.",
      "Hesap kapatılınca Kullanıcının fişleri, kayıtları, kuralları ve firmaları 30 gün içinde silinir. Kanunen saklanması gereken kayıtlar (ör. ödeme ve fatura kayıtları) yalnız bu süre boyunca saklanır.",
      "Kullanıcı, kapatma öncesinde onaylı kayıtlarını Luca dosyası (Excel) olarak indirebilir.",
      "Kullanıcı bu sözleşmeye aykırı davranırsa Accountie, aykırılığı yazılı olarak bildirip makul süre verdikten sonra, ağır hâllerde hemen, sözleşmeyi feshedebilir.",
    ],
  },
  {
    title: "11. Değişiklikler ve bildirimler",
    body: [
      "Accountie bu koşulları değiştirebilir. Değişiklik, yürürlükten en az 15 gün önce e-postayla bildirilir ve bu sayfada yayımlanır. Kullanıcı değişikliği kabul etmezse hesabını kapatabilir.",
      `Kullanıcıya bildirimler hesabındaki e-posta adresine yapılır. Accountie'ye bildirimler: ${PROVIDER.email}, ${PROVIDER.kep}.`,
    ],
  },
  {
    title: "12. Uygulanacak hukuk",
    body: [
      "Bu sözleşmeye Türkiye Cumhuriyeti hukuku uygulanır.",
      "Uyuşmazlıklarda Accountie'nin elektronik kayıtları, Hukuk Muhakemeleri Kanunu'nun 193. maddesi uyarınca delil sayılır; karşı delil sunma hakkı saklıdır.",
      `Uyuşmazlıklarda ${PROVIDER.court} mahkemeleri ve icra daireleri yetkilidir.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage title="Kullanım Koşulları" prefix="k" sections={SECTIONS}
      lead={<>Accountie hizmet sözleşmesi. Yürürlük tarihi: {date}. Hesap oluştururken bu metni kabul edersiniz.</>} />
  );
}
