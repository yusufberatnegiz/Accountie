import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, PROVIDER, type LegalSection } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Accountie nedir, kim için yapıldı, kim yayımlıyor ve nasıl çalışır.",
};
export const dynamic = "force-static";

// Facts only: what the product does and who runs it. No invented customers, figures or history.
const SECTIONS: LegalSection[] = [
  {
    title: "Ne yapıyoruz",
    body: [
      "Accountie, Luca kullanan mali müşavirler ve muhasebe büroları için bir web uygulaması ve Chrome eklentisidir.",
      "Yazar kasa fişinin, Z raporunun ya da faturanın fotoğrafını okur; satıcıyı, tarihi, KDV'yi ve toplamı çıkarır ve yevmiye satırlarını sizin hesap kodlarınızla hazırlar.",
      "Onayladığınız kayıtları Accountie Luca Doldurucu eklentisi Luca'nın Fiş Detayı ekranına yazar ve ekrandan geri okuyup karşılaştırır.",
    ],
  },
  {
    title: "Nasıl çalışıyoruz",
    body: [
      "Kaydın kontrolü sizdedir: hiçbir taslak sizin onayınız olmadan Luca'ya aktarılmaz ve Luca'da Kaydet'e siz basarsınız.",
      <>Luca şifrenizi istemeyiz. Belge fotoğrafları ve PDF&apos;ler Accountie&apos;de saklanmaz; ayrıntılar <Link href="/gizlilik" prefetch={false}>Gizlilik</Link> sayfasında yazılıdır.</>,
      <>Belge okuma kontörle ücretlendirilir; paketler ve fiyatlar <Link href="/fiyatlar" prefetch={false}>Fiyatlar</Link> sayfasındadır.</>,
    ],
  },
  {
    title: "Yayımlayan",
    body: [
      `${PROVIDER.name}, ${PROVIDER.address}.`,
      <>İletişim: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>. Soru, hata bildirimi ve öneriler için <Link href="/destek" prefetch={false}>Bize ulaşın</Link> sayfasına bakın.</>,
    ],
  },
  {
    title: "Luca hakkında",
    body: [
      "Luca, Luca Yazılım'ın markasıdır. Accountie ve Accountie Luca Doldurucu eklentisi Luca Yazılım'ın ürünü değildir ve Luca Yazılım tarafından onaylanmamıştır.",
    ],
  },
];

export default function AboutPage() {
  return <LegalPage title="Hakkımızda" prefix="h" sections={SECTIONS} lead={<>Accountie, fişin fotoğrafından Luca&apos;ya hazır kayıt hazırlar.</>} />;
}
