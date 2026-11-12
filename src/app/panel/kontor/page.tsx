import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreditsView } from "@/components/CreditsView";
import { creditUseByFirm, getBalance, getBillingProfile, listPayments } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { iyzicoConfig } from "@/lib/iyzico";

export const metadata: Metadata = { title: "Kontör" };
export const dynamic = "force-dynamic";

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ odeme?: string; bitti?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { odeme, bitti } = await searchParams;
  const [{ firm }, balance, billing, usage, history] = await Promise.all([
    activeFirm(user.id), getBalance(user.id), getBillingProfile(user.id), creditUseByFirm(user.id), listPayments(user.id),
  ]);
  const ranOut = bitti !== undefined && /^\d{1,4}$/.test(bitti) ? Number(bitti) : undefined;
  return (
    <AppShell current="kontor" email={user.email} firmId={firm.id}>
      <CreditsView balance={balance} open={iyzicoConfig() !== null} billing={billing} usage={usage} history={history} outcome={odeme} ranOut={ranOut} />
    </AppShell>
  );
}
