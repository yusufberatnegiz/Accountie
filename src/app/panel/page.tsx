import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listReceipts } from "@/db/queries";
import { AppShell } from "@/components/AppShell";
import { ReceiptListView, TABS } from "@/components/ReceiptListView";
import { getUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Fişler" };
export const dynamic = "force-dynamic";

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/giris");
  const { durum = "" } = await searchParams;
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  // One query for every tab: the tab counts and the Luca file meter need all statuses, the table shows the current tab.
  const receipts = await listReceipts(userId);

  return (
    <AppShell current="fisler">
      <ReceiptListView receipts={receipts} tab={tab} />
    </AppShell>
  );
}
