import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { listFirms } from "@/db/queries";
import { AppShell } from "@/components/AppShell";
import { ReceiptView } from "@/components/ReceiptView";
import { idSchema } from "@/lib/api-schemas";
import { getSessionUser } from "@/lib/auth/session";
import { loadReceiptView } from "@/lib/receipt-view";

export const metadata: Metadata = { title: "Fiş kontrolü" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const view = await loadReceiptView(user.id, id.data);
  if (!view) notFound();

  return (
    <AppShell current="fis" email={user.email} firmId={view.receipt.firmId} setup={!(await listFirms(user.id)).some((f) => f.fromLuca)}>
      <ReceiptView {...view} />
    </AppShell>
  );
}
