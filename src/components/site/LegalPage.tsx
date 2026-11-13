import Link from "next/link";
import type { ReactNode } from "react";
import { SiteBar } from "@/components/site/SiteBar";
import { PayLogos } from "@/components/site/PayLogos";
import "@/app/gizlilik/gizlilik.css";

export type LegalSection = { title: string; body: ReactNode[] };

/** The same links under every reading page and Fiyatlar, so iyzico's reviewer finds each required page from any of them. */
export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Diğer sayfalar">
      <Link href="/fiyatlar" prefetch={false}>Fiyatlar</Link>
      <Link href="/hakkimizda" prefetch={false}>Hakkımızda</Link>
      <Link href="/kosullar" prefetch={false}>Kullanım Koşulları</Link>
      <Link href="/mesafeli-satis" prefetch={false}>Mesafeli Satış</Link>
      <Link href="/iptal-iade" prefetch={false}>Teslimat ve İade</Link>
      <Link href="/gizlilik" prefetch={false}>Gizlilik</Link>
      <Link href="/kvkk" prefetch={false}>KVKK</Link>
      <Link href="/destek" prefetch={false}>Bize ulaşın</Link>
      <PayLogos className="legal-pay" />
    </nav>
  );
}

/** The reading layout shared by /gizlilik, /kosullar and /kvkk: a title, a lead, and named sections of plain paragraphs. */
export function LegalPage({ title, lead, sections, prefix }: { title: string; lead: ReactNode; sections: LegalSection[]; prefix: string }) {
  return (
    <>
      <SiteBar />
      <main id="icerik" tabIndex={-1} className="legal">
        <h1 className="legal-title">{title}</h1>
        <p className="legal-lead">{lead}</p>
        <div className="legal-body">
          {sections.map((s, i) => (
            <section key={s.title} aria-labelledby={`${prefix}-${i}`}>
              <h2 id={`${prefix}-${i}`}>{s.title}</h2>
              {s.body.map((p, j) => <p key={j}>{p}</p>)}
            </section>
          ))}
        </div>
        <p className="legal-back"><Link href="/">Ana sayfaya dönün</Link></p>
        <LegalLinks />
      </main>
    </>
  );
}

/**
 * Who runs the service, as the pages print it. shortcut: a person, no tax number or KEP yet; add the company's title,
 * MERSİS/VKN and KEP here once it exists (before charging).
 */
export const PROVIDER = {
  name: "Yusuf Berat Negiz",
  address: "Sedir Mahallesi, Vatan Bulvarı, Osman Koca İş Merkezi, Kat 10, Daire 13, Muratpaşa / Antalya",
  email: "destek@accountie.app",
  court: "Antalya",
};
