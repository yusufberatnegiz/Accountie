import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getReceipt } from "@/db/queries";
import { AppHeader } from "@/components/AppHeader";
import { ReceiptView } from "@/components/ReceiptView";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Fiş kontrolü" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/giris");
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  if (!receipt) notFound();

  return (
    <>
      <AppHeader current="fisler" />
      <ReceiptView receipt={receipt} />
    </>
  );
}
