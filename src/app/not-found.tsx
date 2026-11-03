import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Bulunamadı" };

export default function NotFound() {
  return (
    <main id="icerik" tabIndex={-1} className="page">
      <section className="panel panel-pad stack">
        <h1>Fiş veya sayfa bulunamadı</h1>
        <p className="muted">Fiş silinmiş olabilir ya da bağlantı hatalı.</p>
        <p className="actions"><Link className="btn" href="/panel">Fişlere dön</Link><Link className="btn btn-quiet" href="/">Ana sayfa</Link></p>
      </section>
    </main>
  );
}
