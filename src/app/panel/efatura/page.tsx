import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EInvoiceView } from "@/components/EInvoiceView";
import { getSessionUser } from "@/lib/auth/session";
import { getGibCredential } from "@/db/queries";
import { activeFirm } from "@/lib/firm";
import { secretKey } from "@/lib/gib/secret";
import { recentMonths } from "@/lib/month";

export const metadata: Metadata = { title: "e-Fatura ve e-Arşiv" };
export const dynamic = "force-dynamic";

export default async function EInvoicePage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { firm } = await activeFirm(user.id);
  const stored = await getGibCredential(user.id, firm.id);
  // Only whether a login is stored and when it was last used reach the page: the sealed values stay on the server.
  const gib = { enabled: secretKey() !== null, connected: stored !== null, lastUsed: stored?.lastUsedAt ? stored.lastUsedAt.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : null };
  return (
    <AppShell current="fisler" email={user.email} firmId={firm.id}>
      <EInvoiceView key={firm.id} firmName={firm.name} gib={gib} months={recentMonths(new Date())} />
    </AppShell>
  );
}
