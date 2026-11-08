import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listReceipts } from "@/db/queries";
import { AppShell } from "@/components/AppShell";
import { ReceiptListView, TABS } from "@/components/ReceiptListView";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";

export const metadata: Metadata = { title: "Fişler" };
export const dynamic = "force-dynamic";

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const userId = user.id;
  const { durum = "" } = await searchParams;
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  // One query for every tab: the tab counts and the Luca file meter need all statuses, the table shows the current tab.
  const { firm } = await activeFirm(userId);
  const receipts = await listReceipts(userId, firm.id);

  return (
    <AppShell current="fisler" email={user.email} firmId={firm.id}>
      <ReceiptListView receipts={receipts} tab={tab} firm={firm} />
    </AppShell>
  );
}
