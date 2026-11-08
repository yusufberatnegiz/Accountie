// A receipt's month is its receipt date's; a receipt whose date was not read counts in the month it was uploaded (Turkey time).
// The same rule runs in SQL (src/db/queries.ts RECEIPT_MONTH), so the list and the month close always agree.

const NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** "2026-09" and nothing else (a month the URL may carry). */
export const isMonth = (s: unknown): s is string => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** "2026-09" -> "Eylül 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${NAMES[m - 1]} ${y}`;
}

/** The month `now` falls in, in Turkey (UTC+3, no daylight saving since 2016). */
export function currentMonth(now: Date): string {
  return new Date(now.getTime() + 3 * 60 * 60_000).toISOString().slice(0, 7);
}

/** `count` months back from `now`'s, newest first: the months a müşavir closes. */
export function recentMonths(now: Date, count = 12): string[] {
  const [y, m] = currentMonth(now).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export type MonthCounts = { draft: number; approved: number; exported: number };

/**
 * A firm's month: closed ("tamam") when every receipt went to Luca, open ("bekleyen") while a draft or an approved receipt
 * not yet downloaded remains, empty ("bos") without receipts.
 */
export function monthState(c: MonthCounts): "tamam" | "bekleyen" | "bos" {
  if (c.draft + c.approved > 0) return "bekleyen";
  return c.exported > 0 ? "tamam" : "bos";
}
