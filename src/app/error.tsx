"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusPage } from "@/components/StatusPage";

// Root error boundary: Turkish text, no error details on screen.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  // Visitors on the public pages have no list to go back to; send them home instead of into the login redirect.
  const inPanel = usePathname()?.startsWith("/panel");
  return (
    <StatusPage
      alert
      title="Sayfa yüklenemedi"
      actions={<>
        <button className="btn btn-primary" type="button" onClick={() => retry()}>Tekrar dene</button>
        {inPanel ? <Link className="btn" href="/panel">Fişlere dön</Link> : <Link className="btn" href="/">Ana sayfaya dön</Link>}
      </>}
    >
      <p>Bağlantı veya sunucu kaynaklı bir sorun oldu. Tekrar deneyin, sorun sürerse birkaç dakika sonra açın.</p>
    </StatusPage>
  );
}
