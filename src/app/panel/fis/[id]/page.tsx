import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getReceipt, getRules } from "@/db/queries";
import { AppShell } from "@/components/AppShell";
import { ReceiptView } from "@/components/ReceiptView";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Fiş kontrolü" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/giris");
  const id = idSchema.safeParse((await params).id);
  const [receipt, { rules }] = await Promise.all([id.success ? getReceipt(userId, id.data) : null, getRules(userId)]);
  if (!receipt) notFound();

  return (
    <AppShell current="fis">
      <ReceiptView receipt={receipt} rules={rules} />
    </AppShell>
  );
}
