/** GİB's dd/mm/yyyy (time after it ignored) as that day in Turkey, or null. */
export function gibDay(s: string | null): string | null {
  const m = /^(\d{2})[./](\d{2})[./](\d{4})/.exec(s?.trim() ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Today in Turkey as yyyy-mm-dd. */
export const turkeyDay = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);

/** Where the tebliğ day stands (tebliğ is made at that day's end): "past" after it, "today", "future" before it, null without a date. */
export function servedState(servedAt: string | null, now: Date): "past" | "today" | "future" | null {
  const day = gibDay(servedAt);
  if (!day) return null;
  const today = turkeyDay(now);
  return day < today ? "past" : day === today ? "today" : "future";
}

/** Whole days between a read and now. */
export const daysSince = (at: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - at.getTime()) / 86_400_000));

/** One firm's drawer on the e-Tebligat page: its notices in the order given and how many of them are new. */
export type FirmNotices<T> = { firmId: string; firmName: string; rows: T[]; fresh: number };

/** Notices by firm: firms with new notices first (most new first), otherwise in the rows' order (the newest found first). */
export function byFirm<T extends { firmId: string; firmName: string; isNew: boolean }>(rows: readonly T[]): FirmNotices<T>[] {
  const groups = new Map<string, FirmNotices<T>>();
  for (const r of rows) {
    const g = groups.get(r.firmId) ?? { firmId: r.firmId, firmName: r.firmName, rows: [], fresh: 0 };
    g.rows.push(r);
    if (r.isNew) g.fresh++;
    groups.set(r.firmId, g);
  }
  return [...groups.values()].sort((a, b) => b.fresh - a.fresh);
}

/** A scan keeps only notices sent this many days back at most: an old notice (months ago) is never brought in as new. */
export const NOTICE_MAX_AGE_DAYS = 7;

/** Sent (without a sent date: served) at most NOTICE_MAX_AGE_DAYS before today in Turkey. One with no readable date is kept. */
export function recentNotice(n: { sentAt: string | null; servedAt: string | null }, now: Date): boolean {
  const day = gibDay(n.sentAt) ?? gibDay(n.servedAt);
  return !day || day >= turkeyDay(new Date(now.getTime() - NOTICE_MAX_AGE_DAYS * 86_400_000));
}
