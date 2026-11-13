import type { Metadata } from "next";
import Link from "next/link";
import { TERMS_VERSION } from "@/app/giris/validation";
import { LegalPage, PROVIDER, type LegalSection } from "@/components/site/LegalPage";
import { PACKAGES } from "@/lib/credits";
import { formatTrAmount } from "@/lib/money";

export const metadata: Metadata = {
  title: "Mesafeli Hizmet Satış Sözleşmesi",
  description: "Accountie kontör paketlerinin internet üzerinden satışına ilişkin sözleşme: taraflar, bedel, ifa, cayma ve iade.",
};
export const dynamic = "force-static";

// Versioned with the Kullanım Koşulları (TERMS_VERSION, stored on each payment): change both together.
// The packages come from src/lib/credits.ts, so the page never shows a price the checkout does not charge.
const priceList = PACKAGES.map((p) => `${p.credits.toLocaleString("tr-TR")} kontör: ${formatTrAmount(p.priceKurus).replace(/,00$/, "")} TL`).join("; ");

const SECTIONS: LegalSection[] = [
  {
    title: "1. Taraflar",
    body: [
      `Satıcı: ${PROVIDER.name}, ${PROVIDER.address}. E-posta: ${PROVIDER.email}.`,
      "Alıcı: Accountie hesabıyla kontör satın alan ve ödeme sırasında fatura bilgilerini veren kişi ya da işletme.",
    ],
  },
  {
    title: "2. Konu",
    body: [
      "Bu sözleşme, Alıcının Accountie panelindeki Kontör sayfasından satın aldığı kontör paketinin satışını ve ifasını düzenler. Kontör, Accountie\u2019de belge okumak için kullanılır; ayrıntılar Kullanım Koşullarının 6. maddesindedir.",
    ],
  },
  {
    title: "3. Bedel ve ödeme",
    body: [
      `Paketler ve KDV dahil bedelleri: ${priceList}. Ödenecek tutar, ödeme düğmesinde ve sipariş özetinde yazar.`,
      "Ödeme iyzico üzerinden banka ya da kredi kartıyla, tek çekim alınır. Kart bilgileri Satıcıya iletilmez.",
    ],
  },
  {
    title: "4. İfa",
    body: [
      "Kontör, ödeme iyzico tarafından onaylandığı anda Alıcının hesabına eklenir ve Kontör sayfasında görünür. Fiziksel teslimat yoktur.",
      "Ödeme iyzico'nun güvenlik incelemesine düşerse kontör, onay gelince eklenir.",
      "Fatura, Alıcının ödeme sırasında verdiği bilgilerle düzenlenir ve hesabın e-posta adresine gönderilir.",
    ],
  },
  {
    title: "5. Cayma hakkı",
    body: [
      "Alıcı, kontörü mesleki ya da ticari amaçla satın aldığını beyan eder; bu nedenle 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliğindeki cayma hakkı bu satışa uygulanmaz.",
      "Alıcı tüketici sayılsa bile, kontör elektronik ortamda anında ifa edilen bir hizmet olduğundan, ödeme onaylanıp hesaba eklendikten sonra cayma hakkı kullanılamaz (Mesafeli Sözleşmeler Yönetmeliği md. 15).",
    ],
  },
  {
    title: "6. İade",
    body: [
      <>Satın alınan kontör iade edilmez ve paraya çevrilmez. Ayrıntı <Link href="/iptal-iade" prefetch={false}>Teslimat ve İade Şartları</Link> sayfasındadır.</>,
      "Aynı ödemenin iki kez çekilmesi ya da hatalı bir tutarın tahsil edilmesi hâlinde fazla çekilen tutar, Satıcıya bildirildikten sonra karta iade edilir.",
    ],
  },
  {
    title: "7. Diğer hükümler",
    body: [
      "Bu sözleşmede yazmayan konularda Kullanım Koşulları uygulanır. Uyuşmazlıklarda Türk hukuku uygulanır, " + PROVIDER.court + " mahkemeleri ve icra daireleri yetkilidir.",
      "Alıcı, ödeme düğmesine basarak bu sözleşmeyi okuduğunu ve kabul ettiğini beyan eder. Kabul edilen metnin yürürlük tarihi ödeme kaydıyla birlikte saklanır; önceki metinler Satıcıdan istenebilir.",
    ],
  },
];

export default function DistanceSalePage() {
  return <LegalPage title="Mesafeli Hizmet Satış Sözleşmesi" prefix="m" sections={SECTIONS} lead={<>Accountie kontör paketlerinin internet üzerinden satışına ilişkin sözleşme. Yürürlük tarihi: {TERMS_VERSION.split("-").reverse().join(".")}.</>} />;
}
