import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getReceipt, getRules, getVendorRule, nextDraft } from "@/db/queries";
import { AppShell } from "@/components/AppShell";
import { ReceiptView } from "@/components/ReceiptView";
import { idSchema } from "@/lib/api-schemas";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Fiş kontrolü" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const userId = user.id;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [receipt, { rules }] = await Promise.all([getReceipt(userId, id.data), getRules(userId)]);
  if (!receipt) notFound();
  const [next, vendor] = await Promise.all([
    nextDraft(userId, receipt.firmId, id.data),
    receipt.taxNumber && receipt.firmId ? getVendorRule(userId, receipt.firmId, receipt.taxNumber) : null,
  ]);
  // Named only while the receipt still carries it: a line changed since by hand is the user's own choice.
  const learned = vendor && receipt.lines.some((l) => l.accountCode === vendor.accountCode && l.debitKurus > 0) ? vendor : null;

  return (
    <AppShell current="fis" email={user.email} firmId={receipt.firmId}>
      <ReceiptView receipt={receipt} rules={rules} next={next} learned={learned} />
    </AppShell>
  );
}
