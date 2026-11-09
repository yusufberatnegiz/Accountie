// Dev-only preview of the e-Fatura import with a fixed result (no upload). ?tema=acik|koyu forces a theme; ?bos=1 before an upload.
import { PreviewTheme } from "../PreviewTheme";
import { PreviewApi } from "../PreviewApi";
import { AppShell } from "@/components/AppShell";
import { EInvoiceView } from "@/components/EInvoiceView";
import { PREVIEW_EMAIL, PREVIEW_FIRM } from "@/lib/preview-fixtures";

const RESULT = {
  created: 14,
  skipped: [
    { file: "ABC2026000000398.xml", number: "ABC2026000000398", reason: "Firmanın kendi kestiği fatura (satış); gider olarak alınmadı." },
    { file: "XYZ2026000001207.xml", number: "XYZ2026000001207", reason: "TEVKIFAT faturası; elle girin." },
    { file: "ABC2026000000412.xml", number: "ABC2026000000412", reason: "Bu fatura zaten yüklü." },
  ],
};

export default async function PreviewEInvoice({ searchParams }: { searchParams: Promise<{ tema?: string; bos?: string }> }) {
  const { tema, bos } = await searchParams;
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={[]} />
      <AppShell current="fisler" base="/onizleme/panel" email={PREVIEW_EMAIL} firmId={PREVIEW_FIRM.id}>
        <EInvoiceView firmName={PREVIEW_FIRM.name} base="/onizleme/panel" preview={bos ? undefined : RESULT} />
      </AppShell>
    </>
  );
}
