"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Root error boundary: Turkish text, no error details on screen.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  // Visitors on the public pages have no list to go back to; send them home instead of into the login redirect.
  const inPanel = usePathname()?.startsWith("/panel");
  return (
    <main id="icerik" tabIndex={-1} className="page">
      <section className="panel panel-pad stack" role="alert">
        <h1>Sayfa yüklenemedi</h1>
        <p className="muted">Bağlantı veya sunucu kaynaklı bir sorun oldu. Tekrar deneyin, sorun sürerse birkaç dakika sonra açın.</p>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={() => retry()}>Tekrar dene</button>
          {inPanel ? <Link className="btn" href="/panel">Fişlere dön</Link> : <Link className="btn" href="/">Ana sayfaya dön</Link>}
        </div>
      </section>
    </main>
  );
}
