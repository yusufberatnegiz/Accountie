import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NoticesView } from "@/components/NoticesView";
import { listNotices } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";

export const metadata: Metadata = { title: "e-Tebligat" };
export const dynamic = "force-dynamic";

// Tebliğ is deemed made on the 5th day after sending: a firm not read for longer may hold one already served.
const STALE_MS = 5 * 24 * 60 * 60_000;
const when = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function NoticesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const [{ firms, firm }, { notices, scans }] = await Promise.all([activeFirm(user.id), listNotices(user.id)]);
  const now = new Date().getTime();
  return (
    <AppShell current="tebligatlar" email={user.email} firmId={firm.id} setup={!firms.some((f) => f.fromLuca)}>
      <NoticesView notices={notices} scans={scans.map((s) => ({ firmId: s.firmId, firmName: s.firmName, scannedAt: when.format(s.scannedAt), stale: now - s.scannedAt.getTime() > STALE_MS }))} />
    </AppShell>
  );
}
