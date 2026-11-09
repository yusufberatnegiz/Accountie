import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ReconcileView } from "@/components/ReconcileView";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { currentMonth, isMonth, recentMonths } from "@/lib/month";

export const metadata: Metadata = { title: "Muavin karşılaştırması" };
export const dynamic = "force-dynamic";

export default async function ReconcilePage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { ay } = await searchParams;
  const now = new Date();
  const { firm } = await activeFirm(user.id);
  const month = isMonth(ay) ? ay : currentMonth(now);
  return (
    <AppShell current="fisler" email={user.email} firmId={firm.id}>
      {/* Keyed by month: a comparison never stays on screen under another month. */}
      <ReconcileView key={month} firmName={firm.name} month={month} months={recentMonths(now)} />
    </AppShell>
  );
}
