import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreditsView } from "@/components/CreditsView";
import { creditUseByFirm, getBalance, getBillingProfile, listOpenPayments, listPayments } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/session";
import { creditsRequired } from "@/lib/credits";
import { activeFirm } from "@/lib/firm";
import { iyzicoConfig } from "@/lib/iyzico";
import { settlePayment } from "@/lib/settle-payment";

export const metadata: Metadata = { title: "Kontör" };
export const dynamic = "force-dynamic";

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ odeme?: string; bitti?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { odeme, bitti } = await searchParams;
  const cfg = iyzicoConfig();
  // Checkouts still waiting (a bank review, an iyzico that did not answer) are asked again on each visit, before the balance is read.
  let settledNow = false;
  if (cfg) for (const p of await listOpenPayments(user.id)) settledNow = (await settlePayment(cfg, p).catch(() => null)) === "tamam" || settledNow;
  const [{ firm }, balance, billing, usage, history] = await Promise.all([
    activeFirm(user.id), getBalance(user.id), getBillingProfile(user.id), creditUseByFirm(user.id), listPayments(user.id),
  ]);
  const ranOut = bitti !== undefined && /^d{1,4}$/.test(bitti) ? Number(bitti) : undefined;
  return (
    <AppShell current="kontor" email={user.email} firmId={firm.id}>
      <CreditsView balance={balance} open={cfg !== null} required={creditsRequired()} billing={billing} usage={usage} history={history} outcome={settledNow ? "tamam" : odeme} ranOut={ranOut} />
    </AppShell>
  );
}
