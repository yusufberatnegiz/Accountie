import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { GibScanPanel, type GibScanState } from "@/components/GibScanPanel";
import { NoticesView } from "@/components/NoticesView";
import { gibLoginStatus, listNotices, NOTICE_LIST_LIMIT } from "@/db/queries";
import { secretKey } from "@/lib/gib/secret";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { daysSince, servedState, turkeyDay } from "@/lib/notices";

export const metadata: Metadata = { title: "e-Tebligat" };
export const dynamic = "force-dynamic";

// Tebliğ is deemed made at the end of the 5th day after the notice reaches the e-Tebligat address (VUK 107/A).
const STALE_DAYS = 5;
const when = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function NoticesPage({ searchParams }: { searchParams: Promise<{ tarama?: string | string[] }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { tarama } = await searchParams;
  const [{ firms, firm }, gib, listing] = await Promise.all([
    activeFirm(user.id), gibLoginStatus(user.id), tarama === "erisim" ? null : listNotices(user.id),
  ]);
  const now = new Date();
  const gibState: GibScanState = {
    enabled: !!secretKey(), stored: gib.stored,
    until: gib.until && gib.until > now ? when.format(gib.until) : null, day: gib.day,
    reads: gib.reads.map((r) => ({ firmName: r.firmName, readAt: when.format(r.readAt) })),
  };
  const setup = !firms.some((f) => f.fromLuca);
  if (!listing) return (
    <AppShell current="tebligatlar" email={user.email} firmId={firm.id} setup={setup}>
      <main id="icerik" tabIndex={-1} className="canvas canvas-reconcile">
        <h1>e-Tebligat tarama erişimi</h1>
        <GibScanPanel account={user.email} approvalOnly state={gibState} />
      </main>
    </AppShell>
  );
  const { notices, scans, newCount } = listing;
  const today = turkeyDay(now);
  const read = new Map(scans.map((s) => [s.firmId, s.scannedAt]));
  // Every firm, never read ones first, then the oldest reads: the risk is the firm nobody looked at.
  const firmReads = firms.map((f) => {
    const at = read.get(f.id);
    const days = at ? daysSince(at, now) : null;
    return { firmId: f.id, firmName: f.name, scannedAt: at ? when.format(at) : null, days, stale: days === null || days >= STALE_DAYS };
  }).sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity) || a.firmName.localeCompare(b.firmName, "tr"));
  return (
    <AppShell current="tebligatlar" email={user.email} firmId={firm.id} setup={setup}>
      <NoticesView notices={notices.map(({ firstSeenAt, ...n }) => ({ ...n, served: servedState(n.servedAt, now), today: turkeyDay(firstSeenAt) === today }))} firmReads={firmReads} newCount={newCount} truncated={notices.length >= NOTICE_LIST_LIMIT} scanCompleted={tarama === "tamamlandi"}>
        <GibScanPanel account={user.email} state={gibState} />
      </NoticesView>
    </AppShell>
  );
}
