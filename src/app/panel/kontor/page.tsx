import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreditsView } from "@/components/CreditsView";
import { creditUseByFirm, getBalance, getBillingProfile, listOpenPayments, listPayments, recentPaid } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/session";
import { creditsRequired, packageById } from "@/lib/credits";
import { activeFirm } from "@/lib/firm";
import { iyzicoConfig } from "@/lib/iyzico";
import { settlePayment } from "@/lib/settle-payment";

export const metadata: Metadata = { title: "Kontör" };
export const dynamic = "force-dynamic";

const SETTLE_WAIT_MS = 4_000;
const PAID_RECENTLY_MS = 15 * 60_000;

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ odeme?: string; bitti?: string; paket?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { odeme, bitti, paket } = await searchParams;
  const cfg = iyzicoConfig();
  // Checkouts still waiting (a review, an iyzico that did not answer) are asked again, together and for a few seconds at most:
  // a slow iyzico never holds the page; what is not settled now is asked on the next visit.
  let waiting = 0;
  if (cfg) {
    const open = await listOpenPayments(user.id);
    // Paid within the last day and still unanswered: shown, so a charged buyer never sees the payment vanish.
    const dayAgo = new Date(new Date().getTime() - 86_400_000);
    const recent = open.filter((p) => p.createdAt > dayAgo);
    if (open.length) {
      const settled = await Promise.race([Promise.all(open.map((p) => settlePayment(cfg, p).catch(() => null))), new Promise<null>((r) => setTimeout(() => r(null), SETTLE_WAIT_MS))]);
      waiting = settled ? recent.filter((p) => settled[open.indexOf(p)] === "inceleme" || settled[open.indexOf(p)] === "bekliyor").length : recent.length;
    }
  }
  const [{ firm }, balance, billing, usage, history, paid] = await Promise.all([
    activeFirm(user.id), getBalance(user.id), getBillingProfile(user.id), creditUseByFirm(user.id), listPayments(user.id), recentPaid(user.id, PAID_RECENTLY_MS),
  ]);
  const ranOut = bitti !== undefined && /^\d{1,4}$/.test(bitti) ? Number(bitti) : undefined;
  // "Added" only for a purchase really paid moments ago, whatever the address says; otherwise a waiting result keeps its own word.
  const outcome = paid && (odeme === "tamam" || odeme === "bekliyor" || odeme === "inceleme") ? "tamam" : odeme === "tamam" ? undefined : odeme;
  return (
    <AppShell current="kontor" email={user.email} firmId={firm.id}>
      <CreditsView balance={balance} open={cfg !== null} required={creditsRequired()} billing={billing} usage={usage} history={history} outcome={outcome} added={paid?.credits} ranOut={ranOut} waiting={waiting} initialPackage={packageById(paket)?.id} />
    </AppShell>
  );
}
