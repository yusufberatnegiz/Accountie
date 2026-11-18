import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listReceipts } from "@/db/queries";
import { AppShell } from "@/components/AppShell";
import { ReceiptListView, TABS, openHref, listHref } from "@/components/ReceiptListView";
import { ReceiptView } from "@/components/ReceiptView";
import { idSchema } from "@/lib/api-schemas";
import { loadReceiptView } from "@/lib/receipt-view";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { isMonth, recentMonths } from "@/lib/month";

export const metadata: Metadata = { title: "Fişler" };
export const dynamic = "force-dynamic";

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ durum?: string; ay?: string; fis?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const userId = user.id;
  const { durum = "", ay, fis } = await searchParams;
  const month = isMonth(ay) ? ay : "";
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  // One query for every tab: the tab counts and the Luca file meter need all statuses, the table shows the current tab.
  const { firm, firms } = await activeFirm(userId);
  const fisId = idSchema.safeParse(fis);
  const [receipts, view] = await Promise.all([
    listReceipts(userId, firm.id, { month: month || undefined }),
    // A receipt opened from a row (?fis=): another firm's, a deleted or a malformed id opens nothing and the list stays.
    fisId.success ? loadReceiptView(userId, fisId.data) : null,
  ]);
  const close = listHref("/panel", tab.slug, month);

  return (
    <AppShell current="fisler" email={user.email} firmId={firm.id} setup={!firms.some((f) => f.fromLuca)}>
      <ReceiptListView receipts={receipts} tab={tab} firm={firm} month={month} months={recentMonths(new Date())} setup={!firms.some((f) => f.fromLuca)}
        opened={view && view.receipt.firmId === firm.id ? { id: view.receipt.id, detail: <ReceiptView {...view} inList={{ list: close, open: openHref("/panel", tab.slug, month) }} /> } : undefined} />
    </AppShell>
  );
}
