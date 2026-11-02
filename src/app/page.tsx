import { redirect } from "next/navigation";
import { listReceipts } from "@/db/queries";
import { AppHeader } from "@/components/AppHeader";
import { HomeView, TABS } from "@/components/HomeView";
import { getUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/giris");
  const { durum = "" } = await searchParams;
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  const receipts = await listReceipts(userId, tab.status);

  return (
    <>
      <AppHeader current="fisler" />
      <HomeView receipts={receipts} tab={tab} />
    </>
  );
}
