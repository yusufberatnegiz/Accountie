import type { Metadata } from "next";
import { LegalPage, PROVIDER, type LegalSection } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi uyarınca Accountie aydınlatma metni.",
};
export const dynamic = "force-static";

// The headings follow the Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ (md. 5):
// identity, purposes, recipients and why, collection method and legal ground, rights under md. 11.
const SECTIONS: LegalSection[] = [
  {
    title: "Veri sorumlusu",
    body: [
      `${PROVIDER.name}, ${PROVIDER.address}. İletişim: ${PROVIDER.email}.`,
      "Bu metin, Accountie hesabı açan kullanıcıların kişisel verileri içindir. Kullanıcının yüklediği fiş ve faturalardaki üçüncü kişilere ait veriler için ayrıca aşağıdaki \"Müşteri belgeleri\" bölümüne bakın.",
    ],
  },
  {
    title: "İşlenen veriler",
    body: [
      "Kimlik: ad soyad.",
      "İletişim: e-posta adresi.",
      "Müşteri işlem: hesabınıza bağlı firmalar (unvan, vergi numarası, hesap planı), fişlerden okunan alanlar, yevmiye kayıtları ve hesap kurallarınız; Kullanım Koşullarını kabul ettiğiniz tarih.",
      "İşlem güvenliği: oturum çerezi, şifrenin özeti (Accountie şifrenizi görmez), eklenti anahtarının özeti, giriş ve kayıt denemelerinin sayımı için tek yönlü özetlenmiş IP adresi ve e-posta.",
    ],
  },
  {
    title: "Amaçlar ve hukuki sebepler",
    body: [
      "Hesabınızı açmak, hizmeti sunmak, fişleri okuyup kayıt hazırlamak ve size hizmetle ilgili bildirim göndermek: sözleşmenin kurulması ve ifası için gerekli olması (KVKK md. 5/2-c).",
      "Hesabın ve hizmetin güvenliğini sağlamak, kötüye kullanımı önlemek: meşru menfaat (md. 5/2-f) ve veri güvenliği yükümlülüğü (md. 12).",
      "Kanunen saklanması gereken kayıtları saklamak ve yetkili kurumların taleplerini karşılamak: hukuki yükümlülük (md. 5/2-ç).",
      "Accountie size reklam ya da kampanya e-postası göndermez. Gönderecek olursa, önceden ayrıca izninizi alır.",
    ],
  },
  {
    title: "Toplama yöntemi",
    body: [
      "Veriler kayıt formundan, panelde yaptığınız işlemlerden, yüklediğiniz belgelerden ve Chrome eklentisinin Luca ekranından okuduğu firma bilgilerinden elektronik ortamda, otomatik yollarla toplanır.",
    ],
  },
  {
    title: "Aktarım",
    body: [
      "Veriler, hizmetin sunulması için şu hizmet sağlayıcılara aktarılır:",
      "Supabase: veritabanı ve kimlik doğrulama. Sunucular Frankfurt, Almanya'da; şirket ABD'dedir.",
      "Anthropic (ABD): fiş ve fatura okuma. Belge model eğitiminde kullanılmaz; Anthropic kötüye kullanım denetimi için en çok 30 gün tutabilir.",
      "Vercel (ABD): uygulamanın barındırılması.",
      "Cloudflare (ABD): formlarda bot denetimi, açıksa.",
      "Yurt dışına aktarım, KVKK md. 9 uyarınca Kurulun ilan ettiği standart sözleşmeye dayanır. Bunun dışında veriler, yalnız kanunen yetkili kurum ve kuruluşlara, talep hâlinde aktarılır.",
    ],
  },
  {
    title: "Müşteri belgeleri",
    body: [
      "Yüklediğiniz fiş, Z raporu ve faturalarda müşterilerinize ve onların satıcılarına ait veriler bulunabilir (ör. şahıs firmalarında vergi numarası olarak TC kimlik numarası).",
      "Bu veriler bakımından veri sorumlusu siz, Accountie ise veri işleyensiniz. Accountie bu verileri yalnız sizin talimatınızla ve Kullanım Koşullarının 5. maddesindeki şartlarla işler.",
    ],
  },
  {
    title: "Saklama süresi",
    body: [
      "Hesap verileri, hesap açık kaldığı sürece saklanır. Hesabı panelde \"Hesabı sil\" ile sildiğinizde hemen silinir; veritabanı yedeklerinden en geç 30 gün içinde düşer.",
      "Fiş fotoğrafı ve PDF belgeler Accountie'de saklanmaz; okuma hizmeti (Anthropic) en çok 30 gün tutabilir.",
      "Giriş denemesi sayımları bir gün sonra silinir.",
      "Kanunen daha uzun süre saklanması gereken kayıtlar o süre boyunca saklanır, ardından silinir.",
    ],
  },
  {
    title: "Haklarınız",
    body: [
      "KVKK md. 11 uyarınca şu haklara sahipsiniz:",
      "Verinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi isteme.",
      "İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme.",
      "Aktarıldığı kişileri bilme.",
      "Eksik ya da yanlış işlenmişse düzeltilmesini isteme.",
      "Silinmesini ya da yok edilmesini isteme, bu işlemlerin aktarılan kişilere bildirilmesini isteme.",
      "Otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme.",
      "Kanuna aykırı işleme nedeniyle uğradığınız zararın giderilmesini isteme.",
      `Başvurunuzu kayıtlı e-postanızdan ${PROVIDER.email} adresine ya da yazılı olarak ${PROVIDER.address} adresine iletebilirsiniz.`,
      "Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır (Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ).",
    ],
  },
];

export default function KvkkPage() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni" prefix="v" sections={SECTIONS}
      lead={<>6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi uyarınca, kişisel verilerinizi kimin, hangi amaçla, hangi hukuki sebeple işlediğini ve haklarınızı açıklar.</>} />
  );
}
