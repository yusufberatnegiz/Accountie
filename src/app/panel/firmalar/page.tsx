import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FirmsView } from "@/components/FirmsView";
import { getSessionUser } from "@/lib/auth/session";
import { monthCounts } from "@/db/queries";
import { activeFirm } from "@/lib/firm";
import { currentMonth, isMonth, recentMonths } from "@/lib/month";

export const metadata: Metadata = { title: "Firmalar" };
export const dynamic = "force-dynamic";

export default async function FirmsPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { ay } = await searchParams;
  const now = new Date();
  const month = isMonth(ay) ? ay : currentMonth(now);
  const [{ firms, firm }, counts] = await Promise.all([activeFirm(user.id), monthCounts(user.id, month)]);
  return (
    <AppShell current="firmalar" email={user.email} firmId={firm.id}>
      <FirmsView firms={firms} activeId={firm.id} month={month} months={recentMonths(now)} counts={Object.fromEntries(counts)} />
    </AppShell>
  );
}
