import type { Metadata } from "next";
import { LegalPage, PROVIDER, type LegalSection } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Bize ulaşın",
  description: "Accountie ve Accountie Luca Doldurucu eklentisi için destek: soru, hata bildirimi ve hesap işlemleri.",
};
export const dynamic = "force-static";

const SECTIONS: LegalSection[] = [
  {
    title: "Hata bildirirken",
    body: [
      "Hangi ekranda olduğunuzu, ne yaptığınızı ve ne gördüğünüzü yazın. Bir ekran görüntüsü çoğu zaman yeter.",
      "Bir fişle ilgiliyse Accountie'deki evrak numarasını ve tarihini yazın. Fişin fotoğrafını ya da müşterinizin belgesini, biz istemedikçe göndermeyin.",
    ],
  },
  {
    title: "Chrome eklentisi",
    body: [
      "Eklenti, Luca'da açık olan Fiş Detayı ekranına yazar; Kaydet'e basmaz. Satırlar yazılmıyorsa Luca'da Fiş Detayının açık olduğunu ve Accountie'de Kurallar sayfasındaki \"Eklentiye bağla\" ile bağlandığınızı kontrol edin.",
      "Eklentinin sürümünü (chrome://extensions sayfasında, eklentinin adının yanında yazar) mesajınıza ekleyin.",
    ],
  },
  {
    title: "Hesap ve veriler",
    body: [
      "Hesabınızı panelde Hesap menüsünden \"Hesabı sil\" ile kendiniz silebilirsiniz; bütün verileriniz hemen silinir.",
      `Kişisel verilerinizle ilgili başvurular (KVKK md. 11) için kayıtlı e-postanızdan ${PROVIDER.email} adresine yazın. Ayrıntı KVKK Aydınlatma Metnindedir.`,
    ],
  },
];

export default function DestekPage() {
  return (
    <LegalPage title="Bize ulaşın" prefix="d" sections={SECTIONS}
      lead={<>Soru, hata bildirimi ve öneriler için <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a> adresine yazın. Mesajlara iş günlerinde dönüyoruz.</>} />
  );
}
