"use client";

import Link from "next/link";

// Root error boundary: Turkish text, no error details on screen.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="icerik" tabIndex={-1} className="page">
      <section className="panel panel-pad stack" role="alert">
        <h1>Sayfa yüklenemedi</h1>
        <p className="muted">Bağlantı veya sunucu kaynaklı bir sorun oldu. Tekrar deneyin, sorun sürerse birkaç dakika sonra açın.</p>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={() => retry()}>Tekrar dene</button>
          <Link className="btn" href="/">Fişlere dön</Link>
        </div>
      </section>
    </main>
  );
}
