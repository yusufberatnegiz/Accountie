import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EInvoiceView } from "@/components/EInvoiceView";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";

export const metadata: Metadata = { title: "e-Fatura ve e-Arşiv" };
export const dynamic = "force-dynamic";

export default async function EInvoicePage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { firm } = await activeFirm(user.id);
  return (
    <AppShell current="fisler" email={user.email} firmId={firm.id}>
      <EInvoiceView firmName={firm.name} />
    </AppShell>
  );
}
