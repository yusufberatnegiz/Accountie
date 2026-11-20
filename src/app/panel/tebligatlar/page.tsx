import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NoticesView } from "@/components/NoticesView";
import { listNotices, NOTICE_LIST_LIMIT } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { daysSince, servedState } from "@/lib/notices";

export const metadata: Metadata = { title: "e-Tebligat" };
export const dynamic = "force-dynamic";

// Tebliğ is deemed made at the end of the 5th day after the notice reaches the e-Tebligat address (VUK 107/A).
const STALE_DAYS = 5;
const when = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function NoticesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const [{ firms, firm }, { notices, scans, newCount }] = await Promise.all([activeFirm(user.id), listNotices(user.id)]);
  const now = new Date();
  const read = new Map(scans.map((s) => [s.firmId, s.scannedAt]));
  // Every firm, never read ones first, then the oldest reads: the risk is the firm nobody looked at.
  const firmReads = firms.map((f) => {
    const at = read.get(f.id);
    const days = at ? daysSince(at, now) : null;
    return { firmId: f.id, firmName: f.name, scannedAt: at ? when.format(at) : null, days, stale: days === null || days >= STALE_DAYS };
  }).sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
  return (
    <AppShell current="tebligatlar" email={user.email} firmId={firm.id} setup={!firms.some((f) => f.fromLuca)}>
      <NoticesView notices={notices.map((n) => ({ ...n, served: servedState(n.servedAt, now) }))} firmReads={firmReads} newCount={newCount} truncated={notices.length >= NOTICE_LIST_LIMIT} />
    </AppShell>
  );
}
