import type { Metadata } from "next";
import Link from "next/link";
import { SiteBar } from "@/components/site/SiteBar";
import { LegalLinks } from "@/components/site/LegalPage";
import { ThermalDots } from "@/components/home/ThermalDots";
import { PACKAGES, perCreditKurus, savingPercent } from "@/lib/credits";
import { formatTrAmount } from "@/lib/money";
import "@/app/gizlilik/gizlilik.css";
import "./fiyatlar.css";

export const metadata: Metadata = {
  title: "Fiyatlar",
  description: "Accountie kontör paketleri: 100 kontör 750 TL'den başlar, KDV dahil. Fiş ve Z raporu 1, fatura 2 kontör; kontörün süresi dolmaz.",
};
export const dynamic = "force-static";

const tl = (kurus: number) => `${formatTrAmount(kurus).replace(/,00$/, "")} TL`;

/** The public price list (src/lib/credits.ts, the same packages the Kontör page sells). "Satın al" opens that page with the package chosen. */
export default function PricesPage() {
  return (
    <>
      <SiteBar />
      {/* The homepage's heat-print trail under the cards: the same ground, the same hand. */}
      <ThermalDots />
      <main id="icerik" tabIndex={-1} className="legal prices">
        <h1 className="legal-title">Fiyatlar</h1>
        <p className="legal-lead">Belge okuma kontörle ücretlendirilir. Yazar kasa fişi ve Z raporu 1, yurt içi ya da yurt dışı fatura 2 kontör düşer. Kontör bütün firmalarınızda ortaktır ve süresi dolmaz. Fiyatlara KDV dahildir.</p>
        {/* The reading pages' layout: each section's name in the label column, its content in the text column. */}
        <div className="legal-body">
          <section aria-labelledby="f-0">
            <h2 id="f-0">Paketler</h2>
            <ul className="price-list" aria-label="Kontör paketleri">
              {PACKAGES.map((p) => {
                const saving = savingPercent(p);
                return (
                  <li key={p.id} className="price-card">
                    <div className="price-head"><span className="price-name">{p.name}</span>{saving ? <span className="pill pill-positive">Fiş başı %{saving} tasarruf</span> : null}</div>
                    <div className="price-credits"><span className="tnum">{p.credits.toLocaleString("tr-TR")}</span> kontör</div>
                    <div className="price-amount tnum">{tl(p.priceKurus)}</div>
                    <div className="price-unit"><span className="tnum">{formatTrAmount(perCreditKurus(p))}</span> TL / fiş, KDV dahil</div>
                    {/* The panel asks for a session: a visitor goes through Giriş yap and lands on this package. */}
                    <a className="btn btn-primary price-buy" href={`/panel/kontor?paket=${p.id}`} aria-label={`${p.name} paketini satın al, ${tl(p.priceKurus)}`}>Satın al</a>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="f-1">
            <h2 id="f-1">Ödeme</h2>
            <p>Ödeme iyzico üzerinden kartla, tek çekim alınır; kart bilgileri Accountie&apos;ye gelmez. Kontör, ödeme onaylanınca hesabınıza hemen eklenir.</p>
            <p>Kontör zorunluluğu başlayana kadar belge okuma ücretsizdir; başlamadan önce hesabınızdaki e-postaya haber verilir.</p>
          </section>
          <section aria-labelledby="f-2">
            <h2 id="f-2">İade</h2>
            <p>Satıcısı ve toplamı okunamayan belgeden kontör düşmez. Satın alınan kontör iade edilmez. Ayrıntılar: <Link href="/kosullar#k-5" prefetch={false}>Kullanım Koşulları</Link>, <Link href="/mesafeli-satis" prefetch={false}>Mesafeli Satış Sözleşmesi</Link>, <Link href="/iptal-iade" prefetch={false}>Teslimat ve İade Şartları</Link>.</p>
          </section>
        </div>
        <p className="legal-back"><Link href="/">Ana sayfaya dönün</Link></p>
        <LegalLinks />
      </main>
    </>
  );
}
