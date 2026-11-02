// Dev-only fixture preview of the review screen.
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ReceiptView } from "@/components/ReceiptView";
import { PREVIEW_RECEIPTS } from "@/lib/preview-fixtures";

export default async function PreviewReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = PREVIEW_RECEIPTS.find((r) => r.id === id);
  if (!receipt) notFound();
  return (
    <>
      <AppHeader current="fisler" />
      <ReceiptView receipt={receipt} />
    </>
  );
}
