// Dev-only fixture preview of the review screen. ?tema=acik|koyu forces a theme; ?ogrenilen=1 shows the learned-account note.
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PreviewApi } from "../../PreviewApi";
import { PREVIEW_COOKIE, withStatuses } from "../../preview-state";
import { PreviewTheme } from "../../PreviewTheme";
import { AppShell } from "@/components/AppShell";
import { ReceiptView } from "@/components/ReceiptView";
import { DEFAULT_RULES } from "@/lib/default-rules";
import { PREVIEW_RECEIPTS, PREVIEW_EMAIL } from "@/lib/preview-fixtures";

export default async function PreviewReceipt({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tema?: string; ogrenilen?: string }> }) {
  const [{ id }, { tema, ogrenilen }] = await Promise.all([params, searchParams]);
  const all = withStatuses(PREVIEW_RECEIPTS, (await cookies()).get(PREVIEW_COOKIE)?.value);
  const receipt = all.find((r) => r.id === id);
  if (!receipt) notFound();
  const drafts = all.filter((r) => r.status === "draft" && r.id !== id);
  const next = drafts.length ? { id: drafts[0].id, left: drafts.length } : null;
  const expense = receipt.lines.find((l) => l.debitKurus > 0 && !l.accountCode.startsWith("191"));
  const learned = ogrenilen && expense ? { id: "onizleme", taxNumber: receipt.taxNumber ?? "", vendorName: receipt.vendorName, accountCode: expense.accountCode, accountName: expense.accountName } : null;
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={[]} />
      <AppShell current="fis" base="/onizleme/panel" email={PREVIEW_EMAIL} firmId={receipt.firmId}>
        <ReceiptView receipt={receipt} rules={DEFAULT_RULES} next={next} learned={learned} base="/onizleme/panel" />
      </AppShell>
    </>
  );
}
