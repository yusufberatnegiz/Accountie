import Link from "next/link";
import type { ReactNode } from "react";
import { SiteBar } from "@/components/site/SiteBar";
import "@/app/gizlilik/gizlilik.css";

export type LegalSection = { title: string; body: string[] };

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
              {s.body.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
            </section>
          ))}
        </div>
        <p className="legal-back"><Link href="/">Ana sayfaya dönün</Link></p>
      </main>
    </>
  );
}

/**
 * Who runs the service. shortcut: placeholders until the company exists; fill these before any sale or the store listing,
 * the pages show them as written.
 */
export const PROVIDER = {
  name: "[Unvan / ad soyad]",
  address: "[Adres]",
  taxNo: "[Vergi dairesi ve vergi no / MERSİS no]",
  email: "[iletişim e-postası]",
  kep: "[KEP adresi]",
  court: "[İl]",
};
