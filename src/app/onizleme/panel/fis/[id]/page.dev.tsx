// Dev-only fixture preview of the review screen. ?tema=acik|koyu forces a theme.
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ReceiptView } from "@/components/ReceiptView";
import { DEFAULT_RULES } from "@/lib/default-rules";
import { PREVIEW_RECEIPTS, previewThemeScript } from "@/lib/preview-fixtures";

export default async function PreviewReceipt({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tema?: string }> }) {
  const [{ id }, { tema }] = await Promise.all([params, searchParams]);
  const receipt = PREVIEW_RECEIPTS.find((r) => r.id === id);
  if (!receipt) notFound();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: previewThemeScript(tema) }} />
      <AppShell current="fis" base="/onizleme/panel">
        <ReceiptView receipt={receipt} rules={DEFAULT_RULES} base="/onizleme/panel" />
      </AppShell>
    </>
  );
}
