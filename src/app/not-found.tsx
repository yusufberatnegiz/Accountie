import type { Metadata } from "next";
import Link from "next/link";
import { StatusPage } from "@/components/StatusPage";

export const metadata: Metadata = { title: "Bulunamadı" };

export default function NotFound() {
  return (
    <StatusPage
      title="Fiş veya sayfa bulunamadı"
      actions={<><Link className="btn btn-primary" href="/">Ana sayfa</Link><a className="btn" href="/panel">Fişlere dön</a></>}
    >
      <p>Fiş silinmiş olabilir ya da bağlantı hatalı.</p>
    </StatusPage>
  );
}
