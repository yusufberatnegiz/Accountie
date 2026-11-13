import type { Metadata } from "next";
import { LegalPage, PROVIDER, type LegalSection } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Teslimat ve İade Şartları",
  description: "Accountie kontör satın alımlarında iptal, iade ve hatalı tahsilat.",
};
export const dynamic = "force-static";

const SECTIONS: LegalSection[] = [
  {
    title: "Teslimat",
    body: ["Kontör dijital bir hizmettir; ödeme onaylanınca hesabınıza hemen eklenir. Kargo ya da fiziksel teslimat yoktur."],
  },
  {
    title: "İptal",
    body: [
      "Ödeme iyzico\u2019nun sayfasında tamamlanmadan vazgeçerseniz kartınızdan para çekilmez ve kontör eklenmez.",
      "Ödeme onaylanıp kontör hesabınıza eklendikten sonra satın alma iptal edilemez.",
    ],
  },
  {
    title: "İade",
    body: [
      "Satın alınan kontör iade edilmez ve paraya çevrilmez. Kontörün süresi dolmaz; kullanmadığınız kontör hesabınızda kalır.",
      "Satıcısı ve toplamı okunamayan belgeden kontör düşmez; bu düşmeyen kontör iade sayılmaz, bakiyenizde kalır.",
      `Aynı ödeme iki kez çekildiyse ya da hatalı bir tutar tahsil edildiyse ${PROVIDER.email} adresine ödeme tarihini, tutarı ve iyzico\u2019nun gönderdiği ödeme numarasını yazın. Fazla çekilen tutar karta iade edilir; kartınıza yansıma süresi bankanıza bağlıdır.`,
    ],
  },
];

export default function RefundPage() {
  return <LegalPage title="Teslimat ve İade Şartları" prefix="i" sections={SECTIONS} lead={<>Kontör satın alımlarında iptal ve iade koşulları. Ayrıntılar Kullanım Koşullarının 6. maddesinde ve Mesafeli Hizmet Satış Sözleşmesindedir.</>} />;
}
